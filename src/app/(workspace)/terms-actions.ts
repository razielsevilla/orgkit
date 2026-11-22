"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/src/lib/action-result";
import { withOrgCaller, type OrgCaller } from "@/src/lib/orgs/org-access";
import { rpcFailure, type ErrorRule } from "@/src/lib/rpc-errors";
import { termsPath } from "@/src/lib/routes";
import { isUuid } from "@/src/lib/validation";
import { logger } from "@/src/lib/logger";
import {
  officerTermInputSchema,
  TERMS_ERROR_MESSAGES,
  type OfficerTermInput,
  type TermsActionError,
} from "@/src/lib/terms/terms-validation";

export interface OfficerTerm {
  id: string;
  orgId: string;
  memberId: string | null;
  holderName: string;
  roleTitle: string;
  termName: string;
  startDate: string;
  endDate: string;
  isEnded: boolean;
  createdAt: string;
}

export interface WorkspaceTermsData {
  orgId: string;
  orgName: string;
  isAdmin: boolean;
  terms: OfficerTerm[];
  members: { id: string; fullName: string; email: string }[];
  currentTermCount: number;
  pastTermCount: number;
}

const TERM_ERROR_RULES: ErrorRule<TermsActionError>[] = [
  { match: "overlapping_term", error: "overlapping_term", message: TERMS_ERROR_MESSAGES.overlapping_term },
  { match: "invalid_dates", error: "invalid_dates", message: TERMS_ERROR_MESSAGES.invalid_dates },
  { match: "not_admin", error: "not_admin", message: TERMS_ERROR_MESSAGES.not_admin },
  { match: "member_not_found", error: "member_not_found", message: TERMS_ERROR_MESSAGES.member_not_found },
  { match: "not_found", error: "not_found", message: TERMS_ERROR_MESSAGES.not_found },
  { match: "invalid_term_name", error: "invalid_term_name", message: TERMS_ERROR_MESSAGES.invalid_term_name },
  { match: "invalid_role_title", error: "invalid_role_title", message: TERMS_ERROR_MESSAGES.invalid_role_title },
  { match: "invalid_holder_name", error: "invalid_holder_name", message: TERMS_ERROR_MESSAGES.invalid_holder_name },
];

/**
 * Loads all terms and members for an organization.
 * Read-accessible to all officers in the organization.
 */
export async function getWorkspaceTerms(
  orgId: string
): Promise<ActionResult<WorkspaceTermsData, TermsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "getWorkspaceTerms",
      unexpected: "We couldn't load your officer terms. Please try again.",
    },
    async (caller: OrgCaller) => {
      // 1. Fetch organization details
      const { data: orgData, error: orgError } = await caller.supabase
        .from("orgs")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();

      if (orgError || !orgData) {
        logger.error("terms.load_org_failed", { orgId, error: orgError });
        return fail("failed", "Organization not found.");
      }

      // 2. Query officer terms, newest first
      const { data: termRows, error: termsError } = await caller.supabase
        .from("officer_terms")
        .select("id, org_id, member_id, holder_name, role_title, term_name, start_date, end_date, created_at")
        .eq("org_id", orgId)
        .order("start_date", { ascending: false })
        .order("end_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (termsError) {
        logger.error("terms.load_terms_failed", { orgId, error: termsError });
        return fail("failed", "We couldn't load your officer terms. Please try again.");
      }

      // 3. Query roster members (for holder dropdown in term dialog)
      const { data: memberRows } = await caller.supabase
        .from("members")
        .select("id, full_name, email")
        .eq("org_id", orgId)
        .order("full_name", { ascending: true });

      const today = new Date().toISOString().split("T")[0];

      const terms: OfficerTerm[] = (termRows || []).map((row) => ({
        id: row.id,
        orgId: row.org_id,
        memberId: row.member_id,
        holderName: row.holder_name,
        roleTitle: row.role_title,
        termName: row.term_name,
        startDate: row.start_date,
        endDate: row.end_date,
        isEnded: row.end_date < today,
        createdAt: row.created_at,
      }));

      const members = (memberRows || []).map((m) => ({
        id: m.id,
        fullName: m.full_name,
        email: m.email,
      }));

      const currentTermCount = terms.filter((t) => !t.isEnded).length;
      const pastTermCount = terms.filter((t) => t.isEnded).length;

      return ok({
        orgId,
        orgName: orgData.name,
        isAdmin: caller.role === "admin",
        terms,
        members,
        currentTermCount,
        pastTermCount,
      });
    }
  );
}

/**
 * Creates a new officer term. Admin only.
 */
export async function createOfficerTermAction(
  orgId: string,
  input: OfficerTermInput
): Promise<ActionResult<{ id: string }, TermsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "createOfficerTermAction",
      unexpected: "We couldn't record the officer term. Please try again.",
    },
    async (caller: OrgCaller) => {
      if (caller.role !== "admin") {
        return fail("not_admin", TERMS_ERROR_MESSAGES.not_admin);
      }

      const parseResult = officerTermInputSchema.safeParse(input);
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || TERMS_ERROR_MESSAGES.failed;
        return fail("invalid_dates", firstError);
      }

      const validated = parseResult.data;

      const { data, error } = await caller.supabase.rpc("record_officer_term", {
        target_org: orgId,
        p_term_name: validated.termName,
        p_role_title: validated.roleTitle,
        p_holder_name: validated.holderName,
        p_start_date: validated.startDate,
        p_end_date: validated.endDate,
        p_member_id: validated.memberId || null,
      });

      if (error) {
        return rpcFailure("terms.create_failed", error, TERM_ERROR_RULES, {
          fallback: "failed",
          message: TERMS_ERROR_MESSAGES.failed,
          context: { orgId, roleTitle: validated.roleTitle },
        });
      }

      revalidatePath(termsPath(orgId));
      return ok({ id: data as string });
    }
  );
}

/**
 * Updates an existing officer term. Admin only.
 */
export async function updateOfficerTermAction(
  orgId: string,
  termId: string,
  input: OfficerTermInput
): Promise<ActionResult<{ success: true }, TermsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "updateOfficerTermAction",
      unexpected: "We couldn't update the officer term. Please try again.",
    },
    async (caller: OrgCaller) => {
      if (caller.role !== "admin") {
        return fail("not_admin", TERMS_ERROR_MESSAGES.not_admin);
      }

      if (!isUuid(termId)) {
        return fail("not_found", TERMS_ERROR_MESSAGES.not_found);
      }

      const parseResult = officerTermInputSchema.safeParse(input);
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || TERMS_ERROR_MESSAGES.failed;
        return fail("invalid_dates", firstError);
      }

      const validated = parseResult.data;

      const { error } = await caller.supabase.rpc("update_officer_term", {
        p_term_id: termId,
        p_term_name: validated.termName,
        p_role_title: validated.roleTitle,
        p_holder_name: validated.holderName,
        p_start_date: validated.startDate,
        p_end_date: validated.endDate,
        p_member_id: validated.memberId || null,
      });

      if (error) {
        return rpcFailure("terms.update_failed", error, TERM_ERROR_RULES, {
          fallback: "failed",
          message: TERMS_ERROR_MESSAGES.failed,
          context: { orgId, termId },
        });
      }

      revalidatePath(termsPath(orgId));
      return ok({ success: true });
    }
  );
}

/**
 * Deletes an existing officer term. Admin only.
 */
export async function deleteOfficerTermAction(
  orgId: string,
  termId: string
): Promise<ActionResult<{ success: true }, TermsActionError>> {
  return withOrgCaller(
    orgId,
    {
      name: "deleteOfficerTermAction",
      unexpected: "We couldn't delete the officer term. Please try again.",
    },
    async (caller: OrgCaller) => {
      if (caller.role !== "admin") {
        return fail("not_admin", TERMS_ERROR_MESSAGES.not_admin);
      }

      if (!isUuid(termId)) {
        return fail("not_found", TERMS_ERROR_MESSAGES.not_found);
      }

      const { error } = await caller.supabase.rpc("delete_officer_term", {
        p_term_id: termId,
      });

      if (error) {
        return rpcFailure("terms.delete_failed", error, TERM_ERROR_RULES, {
          fallback: "failed",
          message: TERMS_ERROR_MESSAGES.failed,
          context: { orgId, termId },
        });
      }

      revalidatePath(termsPath(orgId));
      return ok({ success: true });
    }
  );
}
