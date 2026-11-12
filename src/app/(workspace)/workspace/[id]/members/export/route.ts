import { getCallerOrgMembership } from "@/src/lib/orgs/org-access";
import { can } from "@/src/lib/orgs/permissions";
import { isUuid } from "@/src/lib/validation";
import {
  CSV_BOM,
  EXPORT_PAGE_SIZE,
  buildDataRow,
  buildHeaderRow,
  columnsFor,
  exportFileName,
  parseExportRequest,
  type ExportRequest,
  type ExportRow,
} from "@/src/lib/members/member-export";

/**
 * POST /workspace/:id/members/export
 *
 * Streams the roster as a CSV for an org admin. The file is made here, from the
 * admin's own session (so row level security still applies), and only the
 * chosen columns are ever selected. Rows are read a page at a time, so a large
 * roster never sits in memory as one string.
 *
 * If anything fails part-way the stream is errored, so the browser's read
 * fails and no partial file is saved. The export is recorded only after the
 * last row, so a failed export leaves no record.
 */

type RouteContext = { params: Promise<{ id: string }> };

function problem(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status, headers: { "Cache-Control": "no-store" } });
}

const GENERIC = "We couldn't make your file. Try again.";

/** A cross-site form post can't send JSON, and a real one carries our own origin. */
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id: orgId } = await params;

  if (!isUuid(orgId)) return problem(404, "not_found", "Org not found.");
  if (!isSameOrigin(request)) return problem(403, "forbidden", "Request not allowed.");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return problem(400, "invalid_request", GENERIC);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, "invalid_request", GENERIC);
  }
  const parsed = parseExportRequest(body);
  if (!parsed.ok) return problem(400, "invalid_request", "Pick at least one field and one status.");
  const { fields, statuses }: ExportRequest = parsed.value;

  try {
    const access = await getCallerOrgMembership(orgId);
    if (!access.ok) {
      return access.error === "not_authenticated"
        ? problem(401, "not_authenticated", "You must be signed in.")
        : problem(403, "access_revoked", "You no longer have access to this org.");
    }
    if (!can(access.caller.role, "members:export")) {
      return problem(403, "not_authorized", "Only admins can export members.");
    }

    const { supabase } = access.caller;
    const columns = columnsFor(fields);

    const readPage = async (offset: number): Promise<ExportRow[]> => {
      const { data, error } = await supabase
        .from("members")
        .select(columns)
        .eq("org_id", orgId)
        .in("status", statuses)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + EXPORT_PAGE_SIZE - 1);
      if (error || !data) throw new Error("members_read_failed");
      return data as unknown as ExportRow[];
    };

    const { data: org } = await supabase.from("orgs").select("name").eq("id", orgId).maybeSingle();
    if (!org) return problem(404, "not_found", "Org not found.");

    // Read the first page before any bytes go out, so a failure or an empty
    // result is a clean error rather than a broken download.
    const firstPage = await readPage(0);
    if (firstPage.length === 0) {
      return problem(422, "no_members", "No members match those statuses.");
    }

    const encoder = new TextEncoder();
    let page: ExportRow[] | null = firstPage;
    let offset = 0;
    let rowCount = 0;
    let started = false;

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          if (!started) {
            started = true;
            controller.enqueue(encoder.encode(CSV_BOM + buildHeaderRow(fields)));
          }

          if (page === null) page = await readPage(offset);

          if (page.length === 0) {
            const { error } = await supabase.rpc("record_member_export", {
              target_org: orgId,
              p_fields: fields,
              p_statuses: statuses,
              p_row_count: rowCount,
            });
            if (error) throw new Error("export_record_failed");
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode(page.map((row) => buildDataRow(row, fields)).join("")));
          rowCount += page.length;
          offset += page.length;
          // A short page was the last one; the next pull records and closes
          page = page.length < EXPORT_PAGE_SIZE ? [] : null;
        } catch (err) {
          console.error("Member export failed:", err instanceof Error ? err.message : "unknown");
          controller.error(err);
        }
      },
    });

    const fileName = exportFileName(org.name);
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        // Lets the browser code read the name through CORS-safe fetch
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
    });
  } catch (err) {
    console.error("Member export failed:", err instanceof Error ? err.message : "unknown");
    return problem(500, "failed", GENERIC);
  }
}
