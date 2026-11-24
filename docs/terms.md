# Ticket H1: Record Officer Roles and Terms

## Overview
Ticket H1 introduces formal record-keeping for officer positions and academic terms in OrgKit. Organization admins can record who holds which officer role, the specific role title, and the exact term dates (start and end). This ensures leadership history is preserved across transitions so future teams and members can see who did what and when.

---

## Acceptance Criteria

1. **Given I am an admin**, when I add an officer role with a title, a person, and start and end dates, then it appears on the org's terms page (`/workspace/:id/terms`).
2. **Given a term has ended**, when I open the terms page, then past terms and their officers are listed newest first.
3. **Given I am an officer who is not an admin**, when I open the terms page, then I can read it but not edit it.
4. **Error or edge cases handled**: an end date before the start date is rejected, and a person cannot hold two overlapping terms for the same role.

---

## Architecture & Data Model

### 1. `officer_terms` Table
The table stores leadership records scoped to an organization:
- `id uuid primary key default gen_random_uuid()`
- `org_id uuid not null references public.orgs (id) on delete cascade`
- `member_id uuid references public.members (id) on delete set null` (optional link to roster member)
- `holder_name text not null check (char_length(btrim(holder_name)) between 2 and 100)`
- `role_title text not null check (char_length(btrim(role_title)) between 2 and 100)`
- `term_name text not null check (char_length(btrim(term_name)) between 2 and 100)`
- `start_date date not null`
- `end_date date not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

**Constraints:**
- `officer_terms_dates_check`: `check (end_date >= start_date)`
- `officer_terms_role_title_length`: `check (char_length(btrim(role_title)) between 2 and 100)`
- `officer_terms_holder_name_length`: `check (char_length(btrim(holder_name)) between 2 and 100)`
- `officer_terms_term_name_length`: `check (char_length(btrim(term_name)) between 2 and 100)`

**Indexes:**
- `officer_terms_org_dates_idx` on `(org_id, start_date desc, end_date desc)`
- `officer_terms_member_idx` on `(member_id)`

### 2. Row Level Security (RLS)
- **Select Policy:** `Officers can read terms in their orgs`
  - Scoped to `is_org_member(org_id)`. All officers (admin, finance, regular) of the organization can view terms.
- **Insert / Update / Delete Policies:**
  - Scoped to `is_org_admin(org_id)`. Only admins can write, update, or remove term records.
- Anonymous and other-org callers cannot access or modify rows.

### 3. Stored Procedures
- `public.record_officer_term(...)`
  - Validates admin authorization (`is_org_admin`).
  - Enforces date ordering (`end_date >= start_date`).
  - Checks for overlapping terms: a person cannot hold two overlapping terms for the same role title (`start_date <= existing.end_date AND end_date >= existing.start_date`).
  - Inserts the new record and returns the UUID.
- `public.update_officer_term(...)`
  - Validates admin authorization.
  - Excludes the current record ID from overlap detection so non-conflicting edits succeed without self-collision.
  - Updates the term and sets `updated_at = now()`.
- `public.delete_officer_term(...)`
  - Validates admin authorization and removes the term.

---

## Validation & Edge Cases

Defined in [`src/lib/terms/terms-validation.ts`](../src/lib/terms/terms-validation.ts):

1. **Date Order:**
   - Evaluated both client-side and server-side: `endDate >= startDate`.
   - Inverted dates return `TERMS_ERROR_MESSAGES.invalid_dates` ("End date cannot be before the start date.").
2. **Term Overlap Prevention:**
   - Overlap detected when:
     - The role title matches case-insensitively (`lower(roleTitle)`).
     - The person matches (via `member_id` match or case-insensitive `holder_name`).
     - The date ranges overlap (`candidate.startDate <= existing.endDate && candidate.endDate >= existing.startDate`).
   - If detected, rejected with `TERMS_ERROR_MESSAGES.overlapping_term` ("A person cannot hold two overlapping terms for the same role.").
   - Concurrency for different roles (e.g. President and Interim Secretary) or different people holding the same role in non-overlapping terms is fully permitted.

---

## UI / UX Design & Navigation

- **Sidebar Entry:**
  - Registered in [`src/components/layout/sidebar/nav-list.tsx`](../src/components/layout/sidebar/nav-list.tsx) with icon `Award` and active section `"terms"`.
- **Top Bar Integration:**
  - Registered in [`src/components/workspace/frame/workspace-frame.tsx`](../src/components/workspace/frame/workspace-frame.tsx) displaying section title "Terms".
- **Visual Grouping & Hierarchy:**
  - Grouped by term cards (e.g., `A.Y. 2025–2026`, `A.Y. 2024–2025`), sorted newest first.
  - Required labels clearly formatted: **"Term"**, **"Role"**, **"Holder"**, **"Starts"**, **"Ends"**.
  - Status badges differentiate "Active Term" from "Ended" terms.
  - Desktop table layout and responsive mobile cards (breakpoint: 768px).
- **Empty & Loading States:**
  - Skeleton component (`TermsSkeleton`) matches the loaded list during suspense.
  - Empty state (`TermsEmptyState`) prompts the admin with a "Record Current Term" button.
- **Access Control:**
  - Non-admins see the full historical list in read-only mode without edit or delete buttons.

---

## Tests & Verification

- **SQL Isolation & Constraints:** `tests/sql/officer-terms.test.ts`
- **Unit Validation Tests:** `tests/unit/terms-validation.test.ts`
- **Action Tests:** `tests/actions/terms-actions.test.ts`
- **UI Component Tests:** `tests/actions/terms-ui.test.tsx`
- **Navigation & Frame Tests:** `tests/actions/workspace-frame.test.tsx`, `tests/actions/workspace-frame-mobile.test.tsx`
