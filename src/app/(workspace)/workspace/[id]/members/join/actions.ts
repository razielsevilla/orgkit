"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isUuid } from "@/src/lib/validation";

export interface JoinLinkResult {
  ok: boolean;
  /** The active token after the change, or null when the link is now off */
  token: string | null;
  error?: string;
}

/**
 * Turns the org's join link on or off, or replaces it. Runs as the signed-in
 * officer; the database function refuses anyone who isn't the org's admin.
 */
export async function setJoinLink(
  orgId: string,
  action: "on" | "off" | "regenerate"
): Promise<JoinLinkResult> {
  const failed = { ok: false, token: null, error: "We couldn't update the link. Please try again." };
  try {
    if (!isUuid(orgId) || !["on", "off", "regenerate"].includes(action)) return failed;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_join_link", {
      target_org: orgId,
      link_action: action,
    });

    if (error) {
      if (error.message.includes("not_admin")) {
        return { ok: false, token: null, error: "Only an admin of this org can change the join link." };
      }
      console.error("Error updating join link:", error);
      return failed;
    }

    return { ok: true, token: typeof data === "string" ? data : null };
  } catch (err) {
    console.error("Unexpected error in setJoinLink:", err);
    return failed;
  }
}
