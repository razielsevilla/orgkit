import { cache } from "react";
import { getSessionUser } from "@/src/lib/auth/session-user";

/**
 * An officer's own profile row, or null when they haven't agreed to the privacy
 * notice yet. Read through their own session, so row level security applies.
 *
 * Memoized per request: the workspace layout gate and the page both need this
 * row, and they run at the same time, so they share one query.
 */
export const getOfficerRow = cache(async (officerId: string) => {
  const { supabase } = await getSessionUser();
  const { data } = await supabase
    .from("officers")
    .select("id, email, full_name")
    .eq("id", officerId)
    .maybeSingle();
  return data;
});
