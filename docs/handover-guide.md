# Handover Guide Template (Ticket H4)

## Overview

The Handover Guide Template allows outgoing officers to document institutional knowledge, ongoing operations, recurring commitments, key contacts, open tasks, and important files for their successors. By structuring the handover process with a fixed 5-section template and linking directly with stored documents (Ticket H2), incoming officers inherit comprehensive context without critical details being dropped.

---

## Acceptance Criteria Matrix

| Criteria | Status | Implementation Details |
|---|---|---|
| **Role-Specific Template** | ✅ Verified | Automatic default section initialization based on officer's role in the current term. |
| **Save & Autosave** | ✅ Verified | Manual save and debounced auto-saving via `saveHandoverGuideAction` server action. |
| **Successor Readability** | ✅ Verified | Marking the guide as `ready` unlocks read-only viewing for all incoming officers and organization members. |
| **Linked Documents (H2)** | ✅ Verified | Direct attachment and one-click opening with secure signed download URLs via `getDocumentDownloadUrlAction`. |
| **Lock / Reopen Governance** | ✅ Verified | Editing is strictly blocked once marked `ready`. Only Organization Admins can reopen guides via `reopenHandoverGuideAction`. |
| **360px Mobile Viewport** | ✅ Verified | Fully responsive, passes `mobile-css-guard.test.ts`, fluid `min(320px, 100%)` containers, minimum 44px touch targets. |

---

## Domain Model & Architecture

### Database Schema (`handover_guides`)

```sql
create table if not exists public.handover_guides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  term_id uuid references public.terms(id) on delete set null,
  role_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('draft', 'ready')),
  sections jsonb not null default '[]'::jsonb,
  linked_document_ids jsonb not null default '[]'::jsonb,
  is_locked boolean not null default false,
  finalized_at timestamptz,
  finalized_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Row Level Security (RLS)
- **Draft Guides**: Accessible only by the author or organization admins.
- **Ready / Finalized Guides**: Readable by all active members and incoming officers in the organization.
- **Modifications**: Authors can update while in `draft` status. Once `status = 'ready'` or `is_locked = true`, mutations are rejected at both RLS and server action layers.
- **Admin Reopening**: Organization admins (`is_org_admin(org_id)`) can reset status to `draft` and unlock editing.

---

## The 5 Fixed Handover Sections

1. **What I do** (`what_i_do`)
   - High-level responsibilities, core scope, and weekly/monthly cadence.
2. **Recurring tasks** (`recurring_tasks`)
   - Routine operations, recurring deadlines, reporting requirements, and event cycles.
3. **Key contacts** (`key_contacts`)
   - Campus advisors, vendors, department contacts, sponsors, and partner organizations.
4. **Open items** (`open_items`)
   - Pending deliverables, uncompleted initiatives, known issues, and in-progress work.
5. **Where things are** (`where_things_are`)
   - Credentials, drive links, inventory locations, physical keys, and document references.

---

## Design System & UX Standards

Following `docs/design.md`:
- **Color Palette**: Emerald primary accents (`#059669`, `#10b981`), neutral Zinc backgrounds and borders (`bg-zinc-50`, `border-zinc-200`).
- **Cards & Surfaces**: Clean white cards with `border border-zinc-200/80 shadow-sm rounded-3xl`.
- **Floating Icons**: Card components include `FloatingIconsDecor` background decorations for brand consistency with terms, officers, and events pages.
- **Pill Buttons**: Action buttons use `rounded-full` / `borderRadius: 9999` with smooth hover states and `focus-visible:ring-2 focus-visible:ring-emerald-500`.
- **Custom Select**: Dropdown filters utilize the accessible OrgKit custom select component with animated chevron indicators and emerald highlight items.
- **Responsive Layout**: Full support from 360px mobile viewports up to ultra-wide displays without horizontal scrollbars.
