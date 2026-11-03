"use server";

import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getSessionUser } from "@/src/lib/auth/session-user";
import { getLatestOrgId } from "@/src/lib/orgs/memberships";

export interface CreateWorkspaceResponse {
  success: boolean;
  orgId?: string;
  existingOrgId?: string;
  needsConsent?: boolean;
  fieldError?: string;
  error?: string;
}

const SAVE_FAILED = "We couldn't create your workspace. Please try again.";
const DUPLICATE_ORG = "An org with this name already exists. Ask one of its officers to add you.";

/**
 * Creates a workspace through the create_organization database function, so the
 * org and the officer's link to it are saved together or not at all. Everything
 * runs as the signed-in officer, so row level security applies.
 */
export async function createWorkspace(
  orgName: string,
  school: string = ""
): Promise<CreateWorkspaceResponse> {
  try {
    const { supabase, user } = await getSessionUser();

    if (!user) {
      return { success: false, error: "You must be signed in to create a workspace." };
    }

    const cleanName = orgName.trim();
    if (!cleanName) {
      return { success: false, fieldError: "Org name is required." };
    }
    if (cleanName.length < 2) {
      return { success: false, fieldError: "Org name must be at least 2 characters." };
    }
    if (cleanName.length > 80) {
      return { success: false, fieldError: "Org name cannot be longer than 80 characters." };
    }

    const { data: orgId, error } = await supabase.rpc("create_organization", {
      org_name: cleanName,
      org_school: school.trim() || null,
    });

    if (!error && orgId) {
      return { success: true, orgId: orgId as string };
    }

    const message = error?.message ?? "";

    if (message.includes("consent_required")) {
      return { success: false, needsConsent: true };
    }

    if (message.includes("already_in_org") || message.includes("org_officers_one_org_per_officer")) {
      const existing = await getOfficerDefaultWorkspace();
      return {
        success: false,
        existingOrgId: existing?.orgId,
        error: "You already have an existing workspace.",
      };
    }

    // Same name and school as an existing org, ignoring capitals and extra spaces.
    // Says nothing else about that org.
    if (error?.code === "23505" || message.includes("orgs_name_key_key")) {
      return { success: false, error: DUPLICATE_ORG };
    }

    if (message.includes("invalid_name")) {
      return { success: false, fieldError: "Org name must be 2 to 80 characters." };
    }

    console.error("Error creating org:", error);
    return { success: false, error: SAVE_FAILED };
  } catch (err) {
    console.error("Unexpected error in createWorkspace:", err);
    return { success: false, error: SAVE_FAILED };
  }
}

/**
 * Loads an organization by ID. Row level security returns it only when the
 * signed-in officer belongs to it, so a guessed link gets nothing.
 */
export async function getOrganizationById(orgId: string) {
  try {
    const { supabase, user } = await getSessionUser();

    if (!user) return null;

    const { data: org, error } = await supabase
      .from("orgs")
      .select("id, name, school, created_at")
      .eq("id", orgId)
      .maybeSingle();

    if (error || !org) return null;

    return org;
  } catch (err) {
    // Let Next.js handle its own control-flow errors (redirects, prerender bailouts)
    unstable_rethrow(err);
    console.error("Unexpected error in getOrganizationById:", err);
    return null;
  }
}

/**
 * The signed-in officer's workspace, or null if they don't have one yet.
 */
export async function getOfficerDefaultWorkspace(): Promise<{
  orgId: string;
  name: string;
  school: string | null;
} | null> {
  try {
    const { supabase, user } = await getSessionUser();

    if (!user) return null;

    const orgId = await getLatestOrgId(supabase, user.id);
    if (!orgId) return null;

    const { data: org } = await supabase
      .from("orgs")
      .select("id, name, school")
      .eq("id", orgId)
      .maybeSingle();

    if (!org) return null;

    return { orgId: org.id, name: org.name, school: org.school || null };
  } catch (err) {
    // Let Next.js handle its own control-flow errors (redirects, prerender bailouts)
    unstable_rethrow(err);
    console.error("Unexpected error in getOfficerDefaultWorkspace:", err);
    return null;
  }
}

/**
 * The signed-in officer's own profile row. Null when they haven't agreed to the
 * privacy notice yet (the workspace layout sends them to /consent first).
 */
export async function getCurrentOfficer(): Promise<{
  id: string;
  email: string;
  full_name: string;
} | null> {
  try {
    const { supabase, user } = await getSessionUser();

    if (!user) return null;

    const { data: officer } = await supabase
      .from("officers")
      .select("id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!officer) return null;

    return {
      id: officer.id,
      email: officer.email || user.email || "",
      full_name: officer.full_name?.trim() || user.email?.split("@")[0] || "Officer",
    };
  } catch (err) {
    // Let Next.js handle its own control-flow errors (redirects, prerender bailouts)
    unstable_rethrow(err);
    console.error("Unexpected error in getCurrentOfficer:", err);
    return null;
  }
}

/**
 * Whether the signed-in officer is an admin of this org. The database decides,
 * so a non-admin can't get a yes by changing anything in the browser.
 */
export async function isOrgAdmin(orgId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("is_org_admin", { target_org: orgId });
    return data === true;
  } catch (err) {
    // Let Next.js handle its own control-flow errors (redirects, prerender bailouts)
    unstable_rethrow(err);
    console.error("Unexpected error in isOrgAdmin:", err);
    return false;
  }
}
