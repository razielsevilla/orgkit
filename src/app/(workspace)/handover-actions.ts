"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller } from "@/src/lib/orgs/org-access";
import { handoverPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { logger } from "@/src/lib/logger";
import {
  HANDOVER_ERROR_MESSAGES,
  saveHandoverGuideSchema,
  setHandoverStatusSchema,
  type HandoverActionError,
  type SaveHandoverGuideInput,
  type SetHandoverStatusInput,
} from "@/src/lib/handover/handover-validation";
import {
  canOfficerEditGuide,
  canOfficerReopenGuide,
  createEmptyHandoverSections,
} from "@/src/lib/handover/handover-helpers";
import type {
  HandoverGuide,
  HandoverSectionsData,
  LinkedDocumentItem,
} from "@/src/lib/handover/handover-types";

export interface HandoverGuidesSummary {
  orgId: string;
  guides: {
    id: string;
    roleTitle: string;
    status: "draft" | "ready";
    termName: string | null;
    authorName: string | null;
    updatedAt: string;
  }[];
  activeRoles: string[];
}

/**
 * Loads all available handover guides for an organization.
 */
export async function getHandoverGuidesListAction(
  orgId: string
): Promise<ActionResult<HandoverGuidesSummary, HandoverActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "handover.get_list",
      unexpected: "Could not load handover guides.",
    },
    async (caller) => {
      const isAdmin = caller.role === "admin";

      // 1. Fetch all handover guides in this organization
      const { data: rows, error } = await caller.supabase
        .from("handover_guides")
        .select(`
          id,
          role_title,
          status,
          term_id,
          author_id,
          updated_at,
          officer_terms:term_id (term_name)
        `)
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });

      if (error) {
        if ((error as { code?: string })?.code === "PGRST205") {
          logger.warn("handover.table_not_found_in_schema_cache", { orgId });
          return ok({ orgId, guides: [], activeRoles: [] });
        }
        logger.error("handover.list_query_failed", { orgId, error });
        return fail("failed", "Failed to retrieve handover guides.");
      }

      // Filter visible guides: ready guides are visible to all officers;
      // draft guides are only visible to their author or an admin
      const visibleRows = (rows || []).filter((r) => {
        if (r.status === "ready") return true;
        if (isAdmin) return true;
        return r.author_id === caller.user.id;
      });

      // 2. Fetch distinct active officer roles for convenience
      const { data: termsData } = await caller.supabase
        .from("officer_terms")
        .select("role_title")
        .eq("org_id", orgId);

      const activeRoles = Array.from(
        new Set((termsData || []).map((t) => t.role_title).filter(Boolean))
      );

      const guides = visibleRows.map((r) => {
        const termRel = r.officer_terms as { term_name?: string } | null;
        return {
          id: r.id,
          roleTitle: r.role_title,
          status: r.status as "draft" | "ready",
          termName: termRel?.term_name || null,
          authorName: null,
          updatedAt: r.updated_at,
        };
      });

      return ok({
        orgId,
        guides,
        activeRoles,
      });
    }
  );
}

/**
 * Loads a specific handover guide by ID or for a specific role title.
 * Populates linked document metadata and permissions.
 */
export async function getHandoverGuideAction(
  orgId: string,
  guideIdOrRole: string
): Promise<ActionResult<HandoverGuide, HandoverActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "handover.get_guide",
      unexpected: "Could not load handover guide.",
    },
    async (caller) => {
      const isAdmin = caller.role === "admin";
      let guideRow: Record<string, unknown> | null = null;

      if (isUuid(guideIdOrRole)) {
        const { data, error } = await caller.supabase
          .from("handover_guides")
          .select(`
            *,
            officer_terms:term_id (term_name)
          `)
          .eq("id", guideIdOrRole)
          .eq("org_id", orgId)
          .maybeSingle();

        if (error) {
          logger.error("handover.get_by_id_failed", { orgId, guideId: guideIdOrRole, error });
          return fail("failed", "Failed to load handover guide.");
        }
        guideRow = data;
      } else {
        // Query by role title (most recent)
        const { data, error } = await caller.supabase
          .from("handover_guides")
          .select(`
            *,
            officer_terms:term_id (term_name)
          `)
          .eq("org_id", orgId)
          .eq("role_title", guideIdOrRole)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.error("handover.get_by_role_failed", { orgId, roleTitle: guideIdOrRole, error });
          return fail("failed", "Failed to load handover guide.");
        }
        guideRow = data;
      }

      // If no guide exists yet, return an unpersisted initial template for that role
      if (!guideRow) {
        const role = isUuid(guideIdOrRole) ? "General Officer" : guideIdOrRole;
        const emptySections = createEmptyHandoverSections();

        const initialGuide: HandoverGuide = {
          id: "",
          orgId,
          termId: null,
          termName: null,
          roleTitle: role,
          status: "draft",
          sections: emptySections,
          linkedDocuments: [],
          authorId: caller.user.id,
          finalizedBy: null,
          finalizedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canEdit: true,
          canReopen: false,
          canFinalize: true,
        };

        return ok(initialGuide);
      }

      const status = guideRow.status as "draft" | "ready";
      const authorId = guideRow.author_id as string | null;

      // Access check: incoming officers can read ready guides. Draft guides require being the author or an admin.
      if (status === "draft" && authorId !== caller.user.id && !isAdmin) {
        return fail("not_authorized", HANDOVER_ERROR_MESSAGES.not_authorized);
      }

      const sectionsData = (guideRow.sections as HandoverSectionsData) || createEmptyHandoverSections();
      const linkedDocIds = Array.isArray(sectionsData.linked_document_ids)
        ? sectionsData.linked_document_ids
        : [];

      // Fetch linked documents details from documents table (H2)
      let linkedDocuments: LinkedDocumentItem[] = [];
      if (linkedDocIds.length > 0) {
        const { data: docRows } = await caller.supabase
          .from("documents")
          .select("id, title, category, kind, url, file_size, mime_type, storage_path")
          .in("id", linkedDocIds)
          .eq("org_id", orgId);

        if (docRows) {
          linkedDocuments = docRows.map((d) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            kind: d.kind as "file" | "link",
            url: d.url,
            fileSize: d.file_size ? Number(d.file_size) : null,
            mimeType: d.mime_type,
            storagePath: d.storage_path,
          }));
        }
      }

      const termRel = guideRow.officer_terms as { term_name?: string } | null;

      const guide: HandoverGuide = {
        id: String(guideRow.id),
        orgId: String(guideRow.org_id),
        termId: guideRow.term_id ? String(guideRow.term_id) : null,
        termName: termRel?.term_name || null,
        roleTitle: String(guideRow.role_title),
        status,
        sections: sectionsData,
        linkedDocuments,
        authorId,
        finalizedBy: guideRow.finalized_by ? String(guideRow.finalized_by) : null,
        finalizedAt: guideRow.finalized_at ? String(guideRow.finalized_at) : null,
        createdAt: String(guideRow.created_at),
        updatedAt: String(guideRow.updated_at),
        canEdit: canOfficerEditGuide({ status, authorId }, caller.user.id, isAdmin),
        canReopen: canOfficerReopenGuide({ status }, isAdmin),
        canFinalize: status === "draft" && (authorId === caller.user.id || isAdmin),
      };

      return ok(guide);
    }
  );
}

/**
 * Saves or auto-saves handover guide sections.
 * Enforces lockdown: edits are rejected if guide is marked ready unless caller is an admin.
 */
export async function saveHandoverGuideAction(
  orgId: string,
  input: SaveHandoverGuideInput
): Promise<ActionResult<{ guideId: string }, HandoverActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "handover.save",
      unexpected: "Failed to save handover guide.",
    },
    async (caller) => {
      const parsed = saveHandoverGuideSchema.safeParse(input);
      if (!parsed.success) {
        return fail("failed", parsed.error.issues[0]?.message || "Validation failed.");
      }

      const { guideId, roleTitle, termId, sections } = parsed.data;
      const isAdmin = caller.role === "admin";

      if (guideId) {
        // 1. Verify existing guide status and author
        const { data: existing, error: fetchErr } = await caller.supabase
          .from("handover_guides")
          .select("id, status, author_id")
          .eq("id", guideId)
          .eq("org_id", orgId)
          .maybeSingle();

        if (fetchErr || !existing) {
          return fail("not_found", HANDOVER_ERROR_MESSAGES.not_found);
        }

        // Lock check: if guide is ready, only admin can edit
        if (existing.status === "ready" && !isAdmin) {
          return fail("forbidden_edit", HANDOVER_ERROR_MESSAGES.forbidden_edit);
        }

        // Non-admin can only edit their own guide
        if (!isAdmin && existing.author_id !== caller.user.id) {
          return fail("not_authorized", HANDOVER_ERROR_MESSAGES.not_authorized);
        }

        // 2. Update existing guide
        const { error: updateErr } = await caller.supabase
          .from("handover_guides")
          .update({
            role_title: roleTitle,
            term_id: termId || null,
            sections,
            updated_at: new Date().toISOString(),
          })
          .eq("id", guideId)
          .eq("org_id", orgId);

        if (updateErr) {
          logger.error("handover.update_failed", { orgId, guideId, error: updateErr });
          return fail("failed", "Failed to update handover guide.");
        }

        revalidatePath(handoverPath(orgId));
        return ok({ guideId });
      }

      // 3. Insert new guide
      const { data: inserted, error: insertErr } = await caller.supabase
        .from("handover_guides")
        .insert({
          org_id: orgId,
          role_title: roleTitle,
          term_id: termId || null,
          status: "draft",
          sections,
          author_id: caller.user.id,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        logger.error("handover.insert_failed", { orgId, error: insertErr });
        return fail("failed", "Failed to create handover guide.");
      }

      revalidatePath(handoverPath(orgId));
      return ok({ guideId: inserted.id });
    }
  );
}

/**
 * Transitions the guide status between draft and ready.
 * - Outgoing author or admin can mark as ready (finalized).
 * - Only an admin can reopen a finalized guide back to draft.
 */
export async function setHandoverStatusAction(
  orgId: string,
  input: SetHandoverStatusInput
): Promise<ActionResult<{ status: "draft" | "ready" }, HandoverActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "handover.set_status",
      unexpected: "Failed to update guide status.",
    },
    async (caller) => {
      const parsed = setHandoverStatusSchema.safeParse(input);
      if (!parsed.success) {
        return fail("failed", parsed.error.issues[0]?.message || "Validation failed.");
      }

      const { guideId, status } = parsed.data;
      const isAdmin = caller.role === "admin";

      // 1. Fetch current guide
      const { data: existing, error: fetchErr } = await caller.supabase
        .from("handover_guides")
        .select("id, status, author_id")
        .eq("id", guideId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return fail("not_found", HANDOVER_ERROR_MESSAGES.not_found);
      }

      // Reopening check: only an admin can reopen a ready guide
      if (status === "draft") {
        if (!isAdmin) {
          return fail(
            "not_authorized",
            "Only an organization admin can reopen a finalized handover guide."
          );
        }
      } else {
        // Marking as ready: must be the author or an admin
        if (!isAdmin && existing.author_id !== caller.user.id) {
          return fail(
            "not_authorized",
            "Only the author or an admin can mark this guide as ready."
          );
        }
      }

      // 2. Perform status transition
      const updatePayload =
        status === "ready"
          ? {
              status: "ready",
              finalized_by: caller.user.id,
              finalized_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : {
              status: "draft",
              finalized_by: null,
              finalized_at: null,
              updated_at: new Date().toISOString(),
            };

      const { error: updateErr } = await caller.supabase
        .from("handover_guides")
        .update(updatePayload)
        .eq("id", guideId)
        .eq("org_id", orgId);

      if (updateErr) {
        logger.error("handover.status_update_failed", { orgId, guideId, status, error: updateErr });
        return fail("failed", "Failed to update guide status.");
      }

      revalidatePath(handoverPath(orgId));
      return ok({ status });
    }
  );
}

/**
 * Returns stored documents from H2 documents table so officers can link them to the guide.
 */
export async function getAvailableHandoverDocumentsAction(
  orgId: string
): Promise<ActionResult<LinkedDocumentItem[], HandoverActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "handover.get_documents",
      unexpected: "Could not load documents.",
    },
    async (caller) => {
      const { data, error } = await caller.supabase
        .from("documents")
        .select("id, title, category, kind, url, file_size, mime_type, storage_path")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        if ((error as { code?: string })?.code === "PGRST205") {
          return ok([]);
        }
        logger.error("handover.documents_query_failed", { orgId, error });
        return fail("failed", "Failed to load documents.");
      }

      const items: LinkedDocumentItem[] = (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        kind: d.kind as "file" | "link",
        url: d.url,
        fileSize: d.file_size ? Number(d.file_size) : null,
        mimeType: d.mime_type,
        storagePath: d.storage_path,
      }));

      return ok(items);
    }
  );
}

