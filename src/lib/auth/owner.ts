import { notFound } from "next/navigation";
import { requireOfficer } from "@/src/lib/auth/officer";
import { getSessionUser } from "@/src/lib/auth/session-user";

/**
 * Call at the top of a page only the product owner may see. The owner is
 * whoever is listed in the platform_owners table, checked in the database by
 * is_platform_owner(); the report function checks it again itself.
 *
 * Anyone else, including an org admin, gets a plain 404, so the page's
 * existence is not revealed. Signed-out visitors and officers who haven't
 * agreed to the privacy notice are sent on by requireOfficer() first.
 */
export async function requireOwner() {
  const { user, officer } = await requireOfficer();
  const { supabase } = await getSessionUser();

  const { data, error } = await supabase.rpc("is_platform_owner");
  // A failed check counts as "not the owner": never open the page by mistake
  if (error || data !== true) notFound();

  return { user, officer };
}
