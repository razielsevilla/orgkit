# In-app feedback (T5)

A signed-in officer can tell the OrgKit team what is working or what is not,
from inside the app, without finding an email address. The message is saved with
the page they were on, so a report like "it broke" says where.

## For officers

A round **Feedback** button sits in the bottom-right corner of every workspace
page: the home and org pages, the new-workspace screen, and the owner pages. On a
phone it shows only the icon; from 640px wide it also shows the word "Feedback".

1. Press it and write a message (up to 2,000 characters).
2. Press **Send feedback**. A confirmation says it was sent.

If sending fails, or you send too many too quickly, the dialog tells you and
**keeps what you wrote**. Closing the dialog by accident also keeps it, until a
message is actually sent. Clicking outside the dialog does not close it.

An empty message, or one over 2,000 characters, is rejected with a message
before anything is sent.

Members who joined through a link have no account and cannot send feedback;
the public join, pay and check-in pages have no feedback button.

## What is saved

In the `feedback` table: the message (line breaks kept), the page the officer
was on, their org when they were inside one, who they are, and the time.

- The **page** is saved as a path with ids removed, for example
  `/workspace/:id/dues`. Query strings and anything that looks like a secret
  token are dropped, so a secret link never lands in the table.
- The **org** is kept only if the officer really belongs to it.
- It is **personal data**: the privacy page says what is kept and who reads it.
  It is deleted automatically when the officer's record is deleted.
- The message text is **never written to the logs**, only an error code.

## Who can read it

Only the product owner, listed in `platform_owners` (see
[usage-metrics.md](usage-metrics.md) for how to add the owner), at
[`/owner/feedback`](routes.md). Everyone else, including org admins, gets a 404,
and the database refuses them too.

Officers have **no access to the table at all**, not even to their own messages.
Writes go through a database function only the app server can call, after it has
checked the session and the rate limit. (A direct insert permission would let a
signed-in browser skip the rate limit by calling the database itself.)

## Limits

| Limit | Value |
|---|---|
| Message length | 2,000 characters |
| Per device | `FEEDBACK_ATTEMPTS_PER_MINUTE`, default **5** a minute |
| Per officer (backstop) | 20 messages an hour, enforced in the database |

Going over either limit shows "You're sending feedback too quickly. Please wait a
minute and try again." The per-device limit counts by IP address, like the join
and check-in limits, so officers on one campus Wi-Fi share a bucket.

## Reading and cleaning up

The inbox shows the latest 100 messages, newest first. There is no reply, no
status and no delete button in the app (out of scope for now). Read it, act on
it, and delete what you no longer need, in the SQL editor:

```sql
-- Everything, newest first
select created_at, page, message from public.feedback order by created_at desc;

-- Delete one handled message
delete from public.feedback where id = '<id from the inbox or the table>';

-- Delete everything older than 90 days
delete from public.feedback where created_at < now() - interval '90 days';
```

Keep feedback only as long as you need it. The backups described in
[backup-and-access.md](backup-and-access.md) also hold it until they are deleted.

## Out of scope

Replying in the app, screenshots or file attachments, ratings or surveys, a
public roadmap, emailing each message to the team (the table and the inbox are
enough for now), and feedback from members on the public pages.
