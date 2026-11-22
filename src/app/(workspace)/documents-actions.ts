"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller } from "@/src/lib/orgs/org-access";
import { documentsPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { logger } from "@/src/lib/logger";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENTS_ERROR_MESSAGES,
  type DocumentCategory,
  type DocumentsActionError,
} from "@/src/lib/documents/documents-validation";

export interface WorkspaceDocument {
  id: string;
  orgId: string;
  title: string;
  category: DocumentCategory;
  kind: "file" | "link";
  storagePath: string | null;
  url: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface WorkspaceDocumentsData {
  orgId: string;
  orgName: string;
  isAdmin: boolean;
  documents: WorkspaceDocument[];
  categories: readonly DocumentCategory[];
}

/**
 * Loads all documents and links for an organization.
 * Read-accessible to all officers in the organization.
 */
export async function getWorkspaceDocuments(
  orgId: string
): Promise<ActionResult<WorkspaceDocumentsData, DocumentsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "documents.get_workspace_documents",
      unexpected: "Could not load documents.",
    },
    async (caller) => {
      // 1. Fetch organization details
      const { data: orgData, error: orgError } = await caller.supabase
        .from("orgs")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();

      if (orgError || !orgData) {
        logger.error("documents.org_not_found", { orgId, error: orgError });
        return fail("not_found", "Organization not found.");
      }

      // 2. Query documents ordered newest first
      const { data: rows, error: docError } = await caller.supabase
        .from("documents")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (docError) {
        logger.error("documents.query_failed", { orgId, error: docError });
        return fail("failed", "Failed to retrieve documents.");
      }

      const documents: WorkspaceDocument[] = (rows || []).map((row) => ({
        id: row.id,
        orgId: row.org_id,
        title: row.title,
        category: row.category as DocumentCategory,
        kind: row.kind as "file" | "link",
        storagePath: row.storage_path,
        url: row.url,
        fileSize: row.file_size ? Number(row.file_size) : null,
        mimeType: row.mime_type,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));

      return ok({
        orgId,
        orgName: orgData.name,
        isAdmin: caller.role === "admin",
        documents,
        categories: DOCUMENT_CATEGORIES,
      });
    }
  );
}
