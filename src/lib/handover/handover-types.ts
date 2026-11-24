export type HandoverStatus = "draft" | "ready";

export type HandoverSectionKey =
  | "what_i_do"
  | "recurring_tasks"
  | "key_contacts"
  | "open_items"
  | "where_things_are";

export interface HandoverSectionsData {
  what_i_do: string;
  recurring_tasks: string;
  key_contacts: string;
  open_items: string;
  where_things_are: string;
  linked_document_ids: string[];
}

export interface LinkedDocumentItem {
  id: string;
  title: string;
  category: string;
  kind: "file" | "link";
  url: string | null;
  fileSize: number | null;
  mimeType: string | null;
  storagePath: string | null;
}

export interface HandoverGuide {
  id: string;
  orgId: string;
  termId: string | null;
  termName?: string | null;
  roleTitle: string;
  status: HandoverStatus;
  sections: HandoverSectionsData;
  linkedDocuments: LinkedDocumentItem[];
  authorId: string | null;
  authorName?: string | null;
  finalizedBy: string | null;
  finalizedByName?: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canReopen: boolean;
  canFinalize: boolean;
}

export interface SectionDefinition {
  key: HandoverSectionKey;
  title: string;
  subtitle: string;
  placeholder: string;
  promptList: readonly string[];
}
