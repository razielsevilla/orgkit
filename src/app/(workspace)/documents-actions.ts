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
  addDocumentLinkSchema,
  type AddDocumentLinkInput,
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

/**
 * Creates an external link document.
 * Accessible to all officers in the organization.
 */
export async function addDocumentLinkAction(
  orgId: string,
  input: AddDocumentLinkInput
): Promise<ActionResult<WorkspaceDocument, DocumentsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "documents.add_link",
      unexpected: "Failed to add document link.",
    },
    async (caller) => {
      const parsed = addDocumentLinkSchema.safeParse(input);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        let errCode: DocumentsActionError = "failed";
        if (firstIssue.path[0] === "title") errCode = "invalid_title";
        else if (firstIssue.path[0] === "category") errCode = "invalid_category";
        else if (firstIssue.path[0] === "url") errCode = "invalid_url";

        return fail(errCode, firstIssue.message);
      }

      const { title, category, url } = parsed.data;

      const { data: newRow, error: insertError } = await caller.supabase
        .from("documents")
        .insert({
          org_id: orgId,
          title,
          category,
          kind: "link",
          url,
          created_by: caller.user.id,
        })
        .select()
        .single();

      if (insertError || !newRow) {
        logger.error("documents.add_link_failed", { orgId, error: insertError });
        return fail("failed", "Failed to add link document.");
      }

      revalidatePath(documentsPath(orgId));

      return ok({
        id: newRow.id,
        orgId: newRow.org_id,
        title: newRow.title,
        category: newRow.category as DocumentCategory,
        kind: "link",
        storagePath: null,
        url: newRow.url,
        fileSize: null,
        mimeType: null,
        createdBy: newRow.created_by,
        createdAt: newRow.created_at,
      });
    }
  );
}

