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

    // Check membership in org_officers
    const { data: membership } = await supabase
      .from("org_officers")
      .select("role, joined_at")
      .eq("org_id", orgId)
      .eq("officer_id", user.id)
      .maybeSingle();

    if (!membership) {
      return null;
    }

    // Fetch org record
    const { data: org } = await supabase
      .from("orgs")
      .select("id, name, school, created_at")
      .eq("id", orgId)
      .maybeSingle();

    return org;
  } catch (err) {
    console.error("Error fetching organization:", err);
    return null;
  }
}
