"use server";

import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/service-role";

export interface CreateWorkspaceResponse {
  success: boolean;
  orgId?: string;
  error?: string;
}

/**
 * Creates a new organization workspace following the ticket data model:
 * - orgs: id (unguessable), name, school (nullable), name_key (lowercased, trimmed name + school, unique), created_at
 * - org_officers: org_id, officer_id, role (default "officer"), joined_at
 */
export async function createWorkspace(
  orgName: string,
  school: string = ""
): Promise<CreateWorkspaceResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to create a workspace." };
    }

    const cleanName = orgName.trim();
    if (!cleanName) {
      return { success: false, error: "Organization name is required." };
    }

    if (cleanName.length < 2) {
      return { success: false, error: "Organization name must be at least 2 characters." };
    }

    // school is nullable
    const cleanSchool = school.trim() || null;

    // name_key: lowercased, trimmed name + school (unique)
    const normalizedName = cleanName.toLowerCase().replace(/\s+/g, " ");
    const nameKey = cleanSchool
      ? `${normalizedName} ${cleanSchool.toLowerCase().replace(/\s+/g, " ")}`
      : normalizedName;

    const admin = createAdminClient();

    // 1. Check for duplicate organization name + school
    const { data: existing } = await admin
      .from("orgs")
      .select("id")
      .eq("name_key", nameKey)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: cleanSchool
          ? `An organization named "${cleanName}" at "${cleanSchool}" already exists.`
          : `An organization named "${cleanName}" already exists.`,
      };
    }

    // 2. Insert into orgs table
    const { data: newOrg, error: orgError } = await admin
      .from("orgs")
      .insert({
        name: cleanName,
        school: cleanSchool,
        name_key: nameKey,
      })
      .select("id")
      .single();

    if (orgError || !newOrg) {
      console.error("Error creating org:", orgError);
      if (orgError?.code === "23505") {
        return {
          success: false,
          error: "An organization with this name and school already exists.",
        };
      }
      return {
        success: false,
        error: "Failed to create organization. Please try again.",
      };
    }

    // 3. Insert into org_officers (role: "officer", joined_at: now)
    const now = new Date().toISOString();
    const { error: memberError } = await admin.from("org_officers").insert({
      org_id: newOrg.id,
      officer_id: user.id,
      role: "officer",
      joined_at: now,
    });

    if (memberError) {
      console.error("Error linking officer to org:", memberError);
      // Clean up orphaned org if membership insertion failed
      await admin.from("orgs").delete().eq("id", newOrg.id);
      return {
        success: false,
        error: "Failed to establish workspace membership. Please try again.",
      };
    }

    return { success: true, orgId: newOrg.id };
  } catch (err) {
    console.error("Unexpected error in createWorkspace:", err);
    return {
      success: false,
      error: "An unexpected error occurred while creating your workspace.",
    };
  }
}

/**
 * Loads an organization by ID if the signed-in officer is a member.
 */
export async function getOrganizationById(orgId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const admin = createAdminClient();

    // Check membership in org_officers
    const { data: membership, error: memError } = await admin
      .from("org_officers")
      .select("role, joined_at")
      .eq("org_id", orgId)
      .eq("officer_id", user.id)
      .maybeSingle();

    if (memError || !membership) {
      console.warn("Officer not member of org:", orgId, memError);
      return null;
    }

    // Fetch org record
    const { data: org, error: orgError } = await admin
      .from("orgs")
      .select("id, name, school, created_at")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org) {
      console.error("Error fetching org record:", orgError);
      return null;
    }

    return org;
  } catch (err) {
    console.error("Unexpected error in getOrganizationById:", err);
    return null;
  }
}

/**
 * Checks if the currently authenticated officer has an assigned workspace.
 * Returns the most recently joined organization or null.
 */
export async function getOfficerDefaultWorkspace(): Promise<{
  orgId: string;
  name: string;
  school: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const admin = createAdminClient();

    // Check if officer belongs to any organization
    const { data: membership, error: memError } = await admin
      .from("org_officers")
      .select("org_id, role, joined_at")
      .eq("officer_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (memError || !membership) {
      return null;
    }

    // Fetch the organization details
    const { data: org, error: orgError } = await admin
      .from("orgs")
      .select("id, name, school")
      .eq("id", membership.org_id)
      .maybeSingle();

    if (orgError || !org) {
      return null;
    }

    return {
      orgId: org.id,
      name: org.name,
      school: org.school || null,
    };
  } catch (err) {
    console.error("Unexpected error in getOfficerDefaultWorkspace:", err);
    return null;
  }
}
