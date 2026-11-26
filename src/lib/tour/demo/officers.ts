import type { ActiveOfficer, PendingInvite, WorkspaceOfficersData } from "@/src/app/(workspace)/officers-actions";
import { isoDaysFromNow } from "@/src/lib/tour/demo/dates";

/**
 * Example team for the officer tour: the real officer (always first, and still
 * "you") plus two teammates and one invite that has not been accepted yet.
 * Email addresses are only filled in for admins, as in the real list.
 */
export function demoOfficersData(real: WorkspaceOfficersData): WorkspaceOfficersData {
  const showEmails = real.currentRole === "admin";

  const teammates: ActiveOfficer[] = [
    {
      id: "00000000-0000-4000-8000-000000000501",
      fullName: "Carlo Fernandez",
      email: showEmails ? "carlo.fernandez@example.edu" : null,
      role: "finance",
      isCurrentUser: false,
      joinedAt: isoDaysFromNow(-30),
    },
    {
      id: "00000000-0000-4000-8000-000000000502",
      fullName: "Denise Aquino",
      email: showEmails ? "denise.aquino@example.edu" : null,
      role: "officer",
      isCurrentUser: false,
      joinedAt: isoDaysFromNow(-12),
    },
  ];

  const invite: PendingInvite = {
    id: "00000000-0000-4000-8000-000000000601",
    role: "officer",
    createdAt: isoDaysFromNow(-2),
    expiresAt: isoDaysFromNow(5),
    email: showEmails ? "new.officer@example.edu" : null,
  };

  const officers = [...real.officers, ...teammates];
  return { ...real, officers, pendingInvites: [invite], officerCount: officers.length };
}
