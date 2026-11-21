import { cache } from "react";
import { getSessionUser } from "@/src/lib/auth/session-user";

/**
 * An org's row, or null when it doesn't exist or the signed-in officer isn't in
 * it (row level security hides it). Memoized per request: the workspace layout
 * and the page under it both ask, and they run at the same time, so they share
 * one query.
 */
export const getOrgRow = cache(async (orgId: string) => {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data: org, error } = await supabase
    .from("orgs")
    .select("id, name, school, created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !org) return null;
  return org;
});

/** Whether the signed-in officer is an admin of this org. The database decides. Memoized per request. */
export const getIsOrgAdmin = cache(async (orgId: string) => {
  const { supabase } = await getSessionUser();
  const { data } = await supabase.rpc("is_org_admin", { target_org: orgId });
  return data === true;
});
