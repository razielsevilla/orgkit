# Ticket P4: Dues Status Dashboard

## Overview
Ticket P4 implements the central **Dues Status Dashboard** in OrgKit. Officers use this view to answer "how much have we collected and who is missing?". It aggregates payments and member records for a selected dues period, displays summary collection metrics, and provides a status-tabbed, paged list of members with search.

---

## Architecture & Calculation Rules

### 1. Calculation Metrics & Edge Cases
- **Amount Collected**:
  - Exact sum of verified payments (`dues_payments.status = 'verified'`) for the period.
  - Inactive members who made a verified payment retain their payment in the collected amount.
- **Expected Total**:
  - `active_member_count * period.amount`.
  - Only active members (`members.status = 'active'`) count toward the expected total.
  - Members who joined mid-period with `active` status are automatically included.
  - Inactive members are excluded from the expected total.
- **Outstanding Amount**:
  - `(unpaid_count + pending_count + rejected_count) * period.amount` (representing debt owed by active members).
- **Rejected Submissions (No Resubmission)**:
  - Count as **Unpaid** (unsettled debt) with status badge `Rejected` and their latest rejection reason.
  - Do not count toward collected amounts until resubmitted and verified.
- **Zero-Division & Empty Safeguards**:
  - Periods with 0 active members or 0 payments compute to `₱0.00` and `0%` collection rate safely without `NaN` or division errors.

### 2. Status Priority for Members
For each member in an organization:
1. `paid`: Member has a verified payment in `dues_payments`.
2. `pending`: Member has an active submitted payment awaiting officer review.
3. `rejected`: Member's latest payment was rejected and has no subsequent submission.
4. `unpaid`: Member has never submitted a payment for this period.

Candidate Pool:
- All active members of the organization.
- Plus any non-active members who made a payment for this period (marked with an `Inactive` badge).
- Inactive members who never paid are completely excluded ("the other isn't counted").

---

## Data Model & Database Function

### 1. Composite Indexes
```sql
create index if not exists dues_payments_org_period_status_idx
  on public.dues_payments (org_id, period_id, status);

create index if not exists dues_payments_period_member_status_idx
  on public.dues_payments (period_id, member_id, status);
```

### 2. Security Definer RPC: `get_dues_period_dashboard`
```sql
public.get_dues_period_dashboard(
  p_period_id uuid,
  p_search text default null,
  p_status text default null,
  p_page int default 1,
  p_page_size int default 20
) returns jsonb
```
- **Access Control**: Validates caller session via `auth.uid()` and organization officer membership via `public.is_org_member(v_period.org_id)`.
- **Privilege Separation**: Direct public and `anon` execution revoked; only authenticated officers granted access.
- **Payload**: Returns a JSON object containing:
  - `period`: Selected period metadata (id, name, amount, due date, open/closed, pay link status).
  - `summary`: Computed collection metrics and counts (`collected_amount`, `expected_amount`, `outstanding_amount`, `paid_count`, `pending_count`, `rejected_count`, `unpaid_count`, `active_member_count`, `total_member_count`).
  - `members`: Paged array of member rows (id, full name, email, member status, dues status, reference number, payment status, reject reason, submission/review date).
  - `pagination`: Current page, page size (20), total matching records, and total pages.

---

## Responsive UI & User Experience

- **Design System Alignment (`docs/design.md`)**:
  - Consistent zinc neutral scale (`#F4F4F5` base, `#FFFFFF` surface, `#18181B` ink, `#71717A` muted, `#E4E4E7` line).
  - Single-accent discipline with signature emerald (`var(--color-accent) = #059669`, `var(--color-accent-strong) = #047857`).
  - Standard semantic status tokens (`var(--color-warning)`, `var(--color-warning-soft)`, `var(--color-danger)`, `var(--color-danger-soft)`).
  - Consistent card frames (`PANEL_RADIUS = 16`, `box-shadow: 0 4px 18px color-mix(in srgb, var(--color-ink) 3%, transparent)`), pill action buttons with hover elevation, and focus rings (`box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #059669`).
- **Period Picker (`DuesPeriodPicker`)**:
  - Switch periods via select dropdown with accessible focus rings.
  - View amount per member and due date.
  - Direct shortcuts to create new period, copy pay link, edit, or close period with rounded-full buttons.
- **Summary Tiles (`DuesSummaryTiles`)**:
  - Primary progress banner: "Collected ₱X of ₱Y" with visual progress bar and outstanding total.
  - 4 status tiles (`Paid`, `Pending review`, `Rejected`, `Unpaid`) with hover lift micro-interactions.
  - The **Pending review** tile features a direct shortcut into the P3 Review Queue modal.
- **Search & Filter Tabs (`DuesSearchFilter`)**:
  - Filter tabs: `All`, `Paid`, `Pending review`, `Unpaid`, `Rejected` with live count badges.
  - 250ms debounced search input matching member full name and email with clear icon button.
- **Desktop Member Table (`DuesMemberTable`)**:
  - Inside-table scroll region (`maxHeight: 520px`, `scrollbarGutter: "stable"`).
  - Table card frame matching `TABLE_CARD_STYLE` and uppercase 12px header row styling.
  - Avatar initials, status pills, copyable reference codes, and formatted dates.
  - 20-per-page pager navigation (`DuesMemberPager`).
- **Mobile Viewport (`DuesMemberMobileCard`)**:
  - Optimized for 360px viewports with zero horizontal scrolling.
  - Single-column card layout with touch targets >= 40px and stacked status details.

---

## Privacy Check Compliance
- [x] **Data Minimization**: Only necessary member details (full name, email, payment status, reference, review date) are shown. Financial amounts are aggregated.
- [x] **Role-Based Access Control**: Limited to authenticated officers of the organization; anon callers and officers of other organizations are blocked at the SQL level (`not_authorized`).
- [x] **Auditing**: Payment verifications and rejections retain their event logs in `dues_payment_events`.

---

## Test Verification Matrix

| # | Scenario | Expected Result | Status |
|---|---|---|---|
| 1 | Mixed Paid, Pending, Rejected, Unpaid | Tile counts and amounts match exact database states | Passed |
| 2 | Collected and Expected totals | Collected counts verified only; expected is active members × amount | Passed |
| 3 | Joined mid-period, deactivated payer, deactivated non-payer | Mid-period joiner is Unpaid; deactivated payer's money stays in collected but isn't expected; deactivated non-payer is not listed | Passed |
| 4 | Rejected payment with no resubmission | Unpaid first with status Rejected; becomes Paid after resubmission is verified | Passed |
| 5 | Filter tabs & search by name and email | Matching members displayed; tab count badges remain accurate | Passed |
| 6 | 50+ members pagination | Pages of 20; scrolling inside table; clean page transitions | Passed |
| 7 | Review queue decision return | Counts and totals refresh live without full page reload | Passed |
| 8 | Empty period with 0 members / 0 payments | Shows zeros, empty state, no division by zero | Passed |
| 9 | Cross-org and anon security isolation | Org B officer and anon calls refused (`not_authorized` / `permission denied`) | Passed |
| 10 | 360px mobile viewport | Mobile cards render; tiles stack; zero horizontal overflow | Passed |
