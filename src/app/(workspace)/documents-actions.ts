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
  MAX_DOCUMENT_FILE_SIZE,
  addDocumentFileMetadataSchema,
  addDocumentLinkSchema,
  isAllowedDocumentFileType,
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
        if ((docError as { code?: string }).code === "PGRST205") {
          logger.warn("documents.table_not_found_in_schema_cache", {
            orgId,
            message:
              "Table public.documents not found in schema cache. Apply migration 20261124120000_h2_documents.sql in Supabase.",
          });
          return ok({
            orgId,
            orgName: orgData.name,
            isAdmin: caller.role === "admin",
            documents: [],
            categories: DOCUMENT_CATEGORIES,
          });
        }
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
        if ((insertError as { code?: string })?.code === "PGRST205") {
          return fail(
            "failed",
            "Database table 'documents' is not yet created. Please run migration 20261124120000_h2_documents.sql in your Supabase SQL editor."
          );
        }
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

/**
 * Uploads a document file to private Supabase storage and stores its record.
 * Rejects oversized and disallowed file types with clear feedback.
 * Automatically cleans up orphaned storage files if the database write fails.
 */
export async function uploadDocumentFileAction(
  orgId: string,
  formData: FormData
): Promise<ActionResult<WorkspaceDocument, DocumentsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "documents.upload_file",
      unexpected: "Failed to upload document file.",
    },
    async (caller) => {
      const rawTitle = formData.get("title");
      const rawCategory = formData.get("category");
      const file = formData.get("file");

      // 1. Validate title & category
      const metaParsed = addDocumentFileMetadataSchema.safeParse({
        title: rawTitle,
        category: rawCategory,
      });

      if (!metaParsed.success) {
        const issue = metaParsed.error.issues[0];
        const errCode: DocumentsActionError =
          issue.path[0] === "title" ? "invalid_title" : "invalid_category";
        return fail(errCode, issue.message);
      }

      // 2. Validate file presence
      if (!file || !(file instanceof File) || file.size === 0) {
        return fail("file_required", DOCUMENTS_ERROR_MESSAGES.file_required);
      }

      // 3. Validate file size (15MB limit)
      if (file.size > MAX_DOCUMENT_FILE_SIZE) {
        return fail("file_too_large", DOCUMENTS_ERROR_MESSAGES.file_too_large);
      }

      // 4. Validate allowed file type & extension
      if (!isAllowedDocumentFileType(file.name, file.type)) {
        return fail("disallowed_file_type", DOCUMENTS_ERROR_MESSAGES.disallowed_file_type);
      }

      const { title, category } = metaParsed.data;
      const fileExt = file.name.includes(".")
        ? file.name.split(".").pop()!.toLowerCase().slice(0, 10)
        : "bin";
      const storagePath = `${orgId}/${crypto.randomUUID()}.${fileExt}`;

      // 5. Convert file to buffer and upload to private storage bucket
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await caller.supabase.storage
        .from("org-documents")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        logger.error("documents.storage_upload_failed", { orgId, storagePath, error: uploadError });
        const isBucketMissing = (uploadError as { message?: string }).message?.includes("Bucket not found");
        return fail(
          "storage_error",
          isBucketMissing
            ? "Storage bucket 'org-documents' not found. Please apply the migration in your Supabase dashboard."
            : DOCUMENTS_ERROR_MESSAGES.storage_error
        );
      }

      // 6. Record metadata in documents table
      const { data: newRow, error: insertError } = await caller.supabase
        .from("documents")
        .insert({
          org_id: orgId,
          title,
          category,
          kind: "file",
          storage_path: storagePath,
          file_size: file.size,
          mime_type: file.type || null,
          created_by: caller.user.id,
        })
        .select()
        .single();

      if (insertError || !newRow) {
        // Orphan cleanup: delete uploaded file from storage if DB write fails
        logger.error("documents.insert_record_failed_cleaning_orphan", {
          orgId,
          storagePath,
          error: insertError,
        });
        await caller.supabase.storage.from("org-documents").remove([storagePath]);
        if ((insertError as { code?: string })?.code === "PGRST205") {
          return fail(
            "failed",
            "Database table 'documents' is not yet created. Please run migration 20261124120000_h2_documents.sql in your Supabase SQL editor."
          );
        }
        return fail("failed", "Failed to save document record.");
      }

      revalidatePath(documentsPath(orgId));

      return ok({
        id: newRow.id,
        orgId: newRow.org_id,
        title: newRow.title,
        category: newRow.category as DocumentCategory,
        kind: "file",
        storagePath: newRow.storage_path,
        url: null,
        fileSize: Number(newRow.file_size),
        mimeType: newRow.mime_type,
        createdBy: newRow.created_by,
        createdAt: newRow.created_at,
      });
    }
  );
}

/**
 * Generates a short-lived (5-minute) signed URL for secure file download.
 * Verified to only grant access to officers of the organization.
 */
export async function getDocumentDownloadUrlAction(
  orgId: string,
  documentId: string
): Promise<ActionResult<{ signedUrl: string }, DocumentsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "documents.get_signed_url",
      unexpected: "Could not generate file download URL.",
    },
    async (caller) => {
      if (!isUuid(documentId)) {
        return fail("not_found", DOCUMENTS_ERROR_MESSAGES.not_found);
      }

      const { data: doc, error: docError } = await caller.supabase
        .from("documents")
        .select("storage_path, kind")
        .eq("id", documentId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (docError || !doc || doc.kind !== "file" || !doc.storage_path) {
        return fail("not_found", DOCUMENTS_ERROR_MESSAGES.not_found);
      }

      const { data, error } = await caller.supabase.storage
        .from("org-documents")
        .createSignedUrl(doc.storage_path, 300);

      if (error || !data?.signedUrl) {
        logger.error("documents.signed_url_failed", { orgId, documentId, error });
        return fail("storage_error", "Failed to generate download URL.");
      }

      return ok({ signedUrl: data.signedUrl });
    }
  );
}

/**
 * Deletes a document record and purges its storage file if it is an uploaded file.
 * Accessible to officers in the organization.
 */
export async function deleteDocumentAction(
  orgId: string,
  documentId: string
): Promise<ActionResult<{ deletedId: string }, DocumentsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "documents.delete",
      unexpected: "Failed to delete document.",
    },
    async (caller) => {
      if (!isUuid(documentId)) {
        return fail("not_found", DOCUMENTS_ERROR_MESSAGES.not_found);
      }

      // 1. Query the document to check its kind and storage_path
      const { data: doc, error: fetchError } = await caller.supabase
        .from("documents")
        .select("storage_path, kind")
        .eq("id", documentId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (fetchError || !doc) {
        return fail("not_found", DOCUMENTS_ERROR_MESSAGES.not_found);
      }

      // 2. Delete the database row
      const { error: deleteError } = await caller.supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("org_id", orgId);

      if (deleteError) {
        logger.error("documents.delete_failed", { orgId, documentId, error: deleteError });
        return fail("failed", "Failed to delete document.");
      }

      // 3. Purge storage file if applicable
      if (doc.kind === "file" && doc.storage_path) {
        const { error: storageRemoveError } = await caller.supabase.storage
          .from("org-documents")
          .remove([doc.storage_path]);

        if (storageRemoveError) {
          logger.error("documents.storage_cleanup_failed", {
            orgId,
            storagePath: doc.storage_path,
            error: storageRemoveError,
          });
        }
      }

      revalidatePath(documentsPath(orgId));

      return ok({ deletedId: documentId });
    }
  );
}


