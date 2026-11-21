# Ticket P5: Payment Reminders

## Overview
Ticket P5 implements officer-initiated payment reminders for dues periods. Organization officers can review eligible unpaid members, preview the bilingual reminder email copy with personalized payment links, and dispatch emails in rate-limited batches through Resend.

Paid, pending, inactive, and other-org members are strictly excluded. The system enforces a 24-hour cooldown per period to prevent duplicate emails, handles partial delivery failures with per-member retry, and provides an accessible, mobile-optimized (360px) dialog interface.

---

## Architecture & Data Model

### 1. `dues_reminders` Table
An append-only delivery log enforcing the 24-hour rate limit and providing auditability:
- `id uuid primary key default gen_random_uuid()`
- `org_id uuid not null references public.orgs(id) on delete cascade`
- `period_id uuid not null references public.dues_periods(id) on delete cascade`
- `member_id uuid not null references public.members(id) on delete cascade`
- `sent_by uuid not null references auth.users(id)`
- `sent_at timestamptz not null default now()`
- `status text not null check (status in ('sent', 'failed', 'bounced', 'skipped'))`
- `error_message text null`

Indexes:
- `dues_reminders_period_member_sent_idx` on `(period_id, member_id, sent_at desc)` for fast 24-hour cooldown lookups.
- `dues_reminders_org_period_idx` on `(org_id, period_id)`.

### 2. Row Level Security (RLS)
- Multi-tenant isolation: `dues_reminders` rows can only be accessed or inserted by active officers of the owning organization (`is_org_member(org_id)`).
- Anonymous and other-org callers receive zero rows and cannot insert records.

### 3. Security Definer Functions
- `public.get_dues_reminder_recipients(p_period_id uuid)`
  - Confirms caller is an officer of the organization.
  - Queries active members of the organization who do not have a `verified` or `submitted` payment for the given period.
  - Filters out members emailed within the last 24 hours (`skip_reason = 'reminded_recently'`).
  - Returns period metadata, counts (`total_active_members`, `total_unpaid`, `eligible`, `skipped_24h`), and recipient evaluation details.
- `public.log_dues_reminder(p_period_id uuid, p_member_id uuid, p_status text, p_error_message text)`
  - Authenticates officer caller and validates target membership.
  - Inserts a delivery event into `dues_reminders`.

---

## Email Dispatch Engine

### 1. Resend & Transport Abstraction
- Defined in [`src/lib/email/email-sender.ts`](../src/lib/email/email-sender.ts).
- `ResendEmailSender`: Connects to Resend API via official client SDK, using `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- `MockEmailSender`: High-performance in-memory transport for unit tests, SQL tests, and local offline development. Simulates bounce and rate-limit errors on demand.

### 2. Batch Chunking & Rate Limiting
- Defined in [`src/lib/dues/dues-reminders-server.ts`](../src/lib/dues/dues-reminders-server.ts) and [`src/lib/dues/dues-reminders-batch.ts`](../src/lib/dues/dues-reminders-batch.ts).
- Targets are processed in chunks of 25 recipients with a 150ms delay between chunks to avoid provider rate spikes.
- Selective Retry: When retrying partial delivery failures, only specified `targetMemberIds` are processed; successful recipients are never re-emailed.

### 3. Bilingual Email Template
- Formats both plain-text and responsive HTML representations.
- Contains:
  - Recipient's name and organization name.
  - Dues period name, formatted amount (₱PHP), and due date.
  - Direct CTA payment link (`/pay/:pay_token`).
  - Filipino courtesy line: *"Paalala lang po: Huwag kalimutang i-settle ang inyong dues bago ang takdang araw. Maraming salamat sa inyong suporta!"*.

---

## User Experience & Mobile Optimization

- **Pre-send Preview Dialog:** Modal displays recipient count badge, 24-hour skip notices, and simulated email preview before sending.
- **Progress Tracking:** Determinate progress bar showing count and percentage during send with ARIA live region (`role="status"`, `aria-live="polite"`).
- **Partial Failure List:** Lists failed recipients with error badges and a one-click *"Retry failed (N)"* action.
- **Empty States:** Clear messaging when everyone has paid or is pending review.
- **Closed Period Lock:** Explanatory banner preventing sends on closed periods.
- **360px Mobile Phone Optimization:** Text break wrapping (`overflowWrap: "anywhere"`, `wordBreak: "break-word"`), flexible wrap buttons, and no horizontal scroll on narrow mobile screens.

---

## Test Plan & Verification Matrix

| # | Scenario | Expected Result | Status |
|---|---|---|---|
| 1 | Open dialog for period with Unpaid, Pending, and Paid members | Count includes only Unpaid active members; preview shows org, amount, due date, and link | Passed |
| 2 | Confirm and send | Each Unpaid member gets one email; a `dues_reminders` row is logged per send | Passed |
| 3 | Check who was emailed | Paid, Pending review, inactive, and other-org members get nothing | Passed |
| 4 | Send again within 24 hours | Already-reminded members are skipped; officer is told how many | Passed |
| 5 | Force some sends to fail, then retry | Failures are listed by member; retry sends only to those that failed | Passed |
| 6 | Closed period, and missing email provider setting | Sending is blocked with a clear explanation | Passed |
| 7 | Everyone has paid or is pending | Dialog shows empty message; send button disabled | Passed |
| 8 | Check the email's link | Opens the correct `/pay/:token` page with matching token for that period | Passed |
| 9 | Cross-org isolation & SQL test as `anon` | Refused; no emails sent; no `dues_reminders` rows readable by other orgs or anon | Passed |
| 10 | 360px phone layout and 100+ member batching | Dialog fits cleanly without horizontal scroll; chunked batch completes reliably | Passed |

---

## Privacy Check

- [x] **Data minimization:** Only minimum personal data (member name, email address, dues amount) is processed for dispatching reminders.
- [x] **Access control:** Restricted strictly to active organization officers via RLS and security definer procedures.
- [x] **No open tracking:** Open tracking pixels and click-tracking redirects are disabled to preserve member privacy.
- [x] **Consent & Notice (Consent v2 Recommendation):** Members currently consent to dues-related communications upon joining. For Consent v2, it is recommended to explicitly state that reminder emails may be dispatched by officers before dues deadlines.

---

## Sprint Review Notes

- **Feature Delivered:** P5 Payment Reminders (officer-initiated, Resend email integration, bilingual templates, rate limiting, and failure retry).
- **Feedback & Considerations:**
  - *Resend Daily Quota:* Resend's free tier allows 100 emails per day (up to 3,000/month). For typical student org batches (20–80 members), this is sufficient. Organizations with >100 unpaid members should configure a verified domain and upgrade to Resend Pro.
  - *Automated Reminders Out of Scope:* Explicitly confirmed that automated/cron reminders remain out of scope as designed, ensuring officers maintain full agency over member communication.
