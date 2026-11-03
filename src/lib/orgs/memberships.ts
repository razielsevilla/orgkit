import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The org an officer joined most recently, or null if they have none. One org
 * per officer in v0.2, so this is "their" org. Pass the officer's own client so
 * row level security applies.
 */
export async function getLatestOrgId(
  supabase: SupabaseClient,
  officerId: string
): Promise<string | null> {
  const { data: membership } = await supabase
    .from("org_officers")
    .select("org_id")
    .eq("officer_id", officerId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return membership?.org_id ?? null;
}

export function workspacePath(orgId: string): string {
  return `/workspace/${orgId}`;
}
