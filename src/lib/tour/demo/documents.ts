import type { WorkspaceDocument, WorkspaceDocumentsData } from "@/src/app/(workspace)/documents-actions";
import { isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example documents for the officer tour: a few files and links across the
 * categories. The files point at nothing, and the page is look-only while the
 * tour is open, so nothing can be opened or downloaded.
 */

const MB = 1024 * 1024;

function file(n: number, title: string, category: WorkspaceDocument["category"], size: number, mime: string, days: number): WorkspaceDocument {
  return {
    id: `00000000-0000-4000-8000-0000000008${String(n).padStart(2, "0")}`,
    orgId: "demo",
    title,
    category,
    kind: "file",
    storagePath: `demo/${n}`,
    url: null,
    fileSize: size,
    mimeType: mime,
    createdBy: null,
    createdAt: isoDaysFromNow(-days),
  };
}

function link(n: number, title: string, category: WorkspaceDocument["category"], url: string, days: number): WorkspaceDocument {
  return {
    id: `00000000-0000-4000-8000-0000000008${String(n).padStart(2, "0")}`,
    orgId: "demo",
    title,
    category,
    kind: "link",
    storagePath: null,
    url,
    fileSize: null,
    mimeType: null,
    createdBy: null,
    createdAt: isoDaysFromNow(-days),
  };
}

export const DEMO_DOCUMENTS: WorkspaceDocument[] = [
  file(1, "Organization Constitution", "Legal", 1.2 * MB, "application/pdf", 90),
  file(2, "Bank Signatory Card", "Finance", 0.4 * MB, "application/pdf", 60),
  file(3, "Event Permit Request Form", "Templates", 0.2 * MB, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 45),
  link(4, "Shared Drive: Org Files", "General", "https://drive.example.com/org-files", 30),
  link(5, "Adviser and Office Contacts", "Contacts", "https://docs.example.com/contacts", 14),
];

/** The example documents, keeping the real org's own name, categories and admin status */
export function demoDocumentsData(real: WorkspaceDocumentsData): WorkspaceDocumentsData {
  return { ...real, documents: DEMO_DOCUMENTS };
}
