import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Call at the top of any protected server page. Sends signed-out visitors to
 * sign-in, and signed-in visitors who haven't agreed to the privacy notice yet
 * to /consent. Reads through the user's own session, so row level security applies.
 */
export async function requireOfficer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: officer } = await supabase
    .from("officers")
    .select("id, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!officer) redirect("/consent");

  return { user, officer };
}
