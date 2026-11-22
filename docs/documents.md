# Ticket H2: Store Key Documents and Links

## Overview
Ticket H2 introduces a centralized documents and links management repository for organizations in OrgKit. Officers can upload key files (constitutions, bank signatory cards, event permits, official templates) and add external links (shared Google Drives, team workspaces, form templates) categorized by functional domain. This ensures that essential institutional records are preserved across officer transitions and handovers rather than being lost in personal chats or private drives.

---

## Acceptance Criteria

1. **Given I am an officer**, when I upload a file with a title and category, then it appears in the document list (`/workspace/:id/documents`).
2. **Given I am an officer**, when I add an external link with a title and category, then it appears in the same document list.
3. **Given I am a member who is not an officer**, when I try to open the documents page, then access is denied.
4. **Given another org's officer**, when they request my org's file, then access is denied.
5. **Error or edge cases handled**: oversized files (> 15 MB) or disallowed file types (executables, scripts) are rejected with a clear message, and invalid URLs (non-http/https, script schemes) are rejected.
6. **Works on a 360px-wide phone**: fully responsive mobile card layout and modal dialogs with zero horizontal clipping.

---

## Architecture & Data Model

### 1. `documents` Table
Scoped directly to an organization:
- `id uuid primary key default gen_random_uuid()`
- `org_id uuid not null references public.orgs (id) on delete cascade`
- `title text not null check (char_length(btrim(title)) between 2 and 150)`
- `category text not null check (category in ('Finance', 'Legal', 'Templates', 'Contacts', 'General'))`
- `kind text not null check (kind in ('file', 'link'))`
- `storage_path text` (required for files, must be null for links)
- `url text` (required for links, must be null for files)
- `file_size bigint` (positive for files, null for links)
- `mime_type text` (optional mime string for files, null for links)
- `created_by uuid references auth.users (id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**Indexes:**
- `documents_org_created_idx` on `(org_id, created_at desc)`
- `documents_org_category_idx` on `(org_id, category)`

### 2. Row Level Security (RLS)
- **Select Policy:** `Officers can read documents in their orgs`
  - Scoped to `is_org_member(org_id)`. All officers of the organization can view documents.
- **Insert Policy:** `Officers can insert documents in their orgs`
  - Scoped to `is_org_member(org_id)`.
- **Delete Policy:** `Officers can delete documents in their orgs`
  - Scoped to `is_org_member(org_id)`.
- Anonymous callers and officers of other organizations cannot access or modify rows. Non-officer student members (`members` table) are denied access because `is_org_member` verifies `org_officers`.

### 3. Supabase Storage: `org-documents` Bucket
- **Bucket Visibility:** Private (`public = false`).
- **Object Path Hierarchy:** `${orgId}/${uuid}.${ext}`.
- **Download Security:** File downloads use short-lived (5-minute) signed URLs created on-demand via `getDocumentDownloadUrlAction`. Cross-org download requests fail because the server action and storage checks verify caller organization membership.
- **Orphan Cleanup:** If a storage upload succeeds but the subsequent database record insertion fails, the server action automatically purges the orphaned file from storage. When a document is deleted, its storage object is also removed.

---

## Validation & Edge Cases

Defined in [`src/lib/documents/documents-validation.ts`](../src/lib/documents/documents-validation.ts):

1. **Title Length:**
   - Must be between 2 and 150 characters after trimming.
2. **Category Selection:**
   - Restricted to: `"Finance"`, `"Legal"`, `"Templates"`, `"Contacts"`, `"General"`.
3. **URL Validation:**
   - Strictly validated using `isValidExternalUrl`: must start with `http://` or `https://` with a valid hostname. Dangerous schemes (`javascript:`, `file:`, `data:`) and malformed strings are rejected.
4. **File Limits & Allowed Types:**
   - Maximum file size: **15 MB** (`MAX_DOCUMENT_FILE_SIZE`).
   - Allowed formats: PDF (`.pdf`), Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`), PowerPoint (`.ppt`, `.pptx`), CSV (`.csv`), Plain Text (`.txt`), and Images (`.png`, `.jpg`, `.jpeg`, `.webp`).
   - Dangerous executables and scripts (`.exe`, `.bat`, `.sh`, `.js`, `.php`) are strictly blocked.

---

## UI / UX Design & Responsive Viewports

- **Sidebar Entry:**
  - Registered in [`src/components/layout/sidebar/nav-list.tsx`](../src/components/layout/sidebar/nav-list.tsx) with icon `Files` and active section `"documents"`.
- **Top Bar Integration:**
  - Registered in [`src/components/workspace/frame/workspace-frame.tsx`](../src/components/workspace/frame/workspace-frame.tsx) displaying section title "Documents".
- **Dual-Mode Responsive Layout:**
  - **Desktop ($\ge 768\text{px}$):** Comprehensive data table displaying Document Name, Category, Kind, Size / Target Domain, Date Added, and Quick Action buttons.
  - **Mobile ($< 768\text{px}$ down to $360\text{px}$):** Card layout (`DocumentMobileCard`) where actions, category badges, and document titles wrap cleanly without horizontal scrolling.
- **Empty & Loading States:**
  - Loading skeleton (`DocumentsSkeleton`) with pulsing shimmer effects matching the loaded table layout.
  - Informative empty state (`DocumentsEmptyState`) explaining the purpose of the repository with quick-action triggers to upload a file or add a link.
- **Dialogs:**
  - `AddFileDialog`: File dropzone, auto-suggested title from filename, category picker, and progress spinner.
  - `AddLinkDialog`: URL input, title input, and category picker.
  - `DeleteDocumentDialog`: Destructive confirmation dialog specifying file deletion impact.

---

## Tests & Verification

- **Database RLS & Constraint Isolation:** `tests/sql/documents-isolation.test.ts`
- **Validation Unit Tests:** `tests/unit/documents-validation.test.ts`
- **Server Action Tests:** `tests/actions/documents-actions.test.ts`
- **UI Component Tests:** `tests/actions/documents-ui.test.tsx`
- **Mobile 360px Viewport Tests:** `tests/actions/documents-mobile.test.tsx`
- **Workspace Navigation & Frame Tests:** `tests/actions/workspace-frame.test.tsx`, `tests/actions/workspace-frame-mobile.test.tsx`
