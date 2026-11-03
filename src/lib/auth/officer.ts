import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { getOfficerRow } from "@/src/lib/auth/officer-profile";
import { ROUTES } from "@/src/lib/routes";

/**
 * Call at the top of any protected server page. Sends signed-out visitors to
 * sign-in, and signed-in visitors who haven't agreed to the privacy notice yet
 * to /consent. Reads through the user's own session, so row level security applies.
 */
export async function requireOfficer() {
  await connection();
  const { user } = await getSessionUser();

  if (!user) redirect(ROUTES.signIn);

  const officer = await getOfficerRow(user.id);

  if (!officer) redirect(ROUTES.consent);

  return { user, officer };
}
