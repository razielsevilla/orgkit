import { z } from "zod";
import { isUuid } from "../validation.ts";

/** Date format string: YYYY-MM-DD */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const TERMS_ERROR_MESSAGES = {
  invalid_term_name: "Term name must be between 2 and 100 characters.",
  invalid_role_title: "Role title must be between 2 and 100 characters.",
  invalid_holder_name: "Holder name must be between 2 and 100 characters.",
  invalid_dates: "End date cannot be before the start date.",
  overlapping_term: "A person cannot hold two overlapping terms for the same role.",
  member_not_found: "The selected member was not found in this organization.",
  not_admin: "Only organization admins can record or manage officer terms.",
  not_authenticated: "You must be signed in to perform this action.",
  not_found: "The requested officer term was not found.",
  failed: "An unexpected error occurred. Please try again.",
} as const;

export type TermsActionError = keyof typeof TERMS_ERROR_MESSAGES;

export interface TermDateRange {
  startDate: string;
  endDate: string;
}

export interface ExistingTermCheck extends TermDateRange {
  id: string;
  roleTitle: string;
  holderName: string;
  memberId?: string | null;
}

/**
 * Validates that an end date is on or after the start date (YYYY-MM-DD).
 */
export function areDatesOrdered(startDate: string, endDate: string): boolean {
  if (!ISO_DATE_REGEX.test(startDate) || !ISO_DATE_REGEX.test(endDate)) {
    return false;
  }
  return startDate <= endDate;
}

/**
 * Checks whether two date ranges [s1, e1] and [s2, e2] overlap.
 * Both ranges are inclusive: [start, end].
 */
export function doDateRangesOverlap(
  range1: TermDateRange,
  range2: TermDateRange
): boolean {
  return range1.startDate <= range2.endDate && range1.endDate >= range2.startDate;
}

/**
 * Detects if a new or updated term conflicts with any existing term
 * for the same person and same role title within an overlapping timeframe.
 */
export function findOverlappingTerm(
  existingTerms: ExistingTermCheck[],
  candidate: {
    id?: string;
    roleTitle: string;
    holderName: string;
    memberId?: string | null;
    startDate: string;
    endDate: string;
  }
): ExistingTermCheck | null {
  const normCandidateRole = candidate.roleTitle.trim().toLowerCase();
  const normCandidateHolder = candidate.holderName.trim().toLowerCase();

  for (const term of existingTerms) {
    // If editing, skip comparing with itself
    if (candidate.id && term.id === candidate.id) {
      continue;
    }

    const normRole = term.roleTitle.trim().toLowerCase();
    if (normRole !== normCandidateRole) {
      continue;
    }

    const samePerson =
      (candidate.memberId && term.memberId && candidate.memberId === term.memberId) ||
      normCandidateHolder === term.holderName.trim().toLowerCase();

    if (samePerson && doDateRangesOverlap(candidate, term)) {
      return term;
    }
  }

  return null;
}

export const officerTermInputSchema = z
  .object({
    termName: z
      .string()
      .trim()
      .min(2, TERMS_ERROR_MESSAGES.invalid_term_name)
      .max(100, TERMS_ERROR_MESSAGES.invalid_term_name),
    roleTitle: z
      .string()
      .trim()
      .min(2, TERMS_ERROR_MESSAGES.invalid_role_title)
      .max(100, TERMS_ERROR_MESSAGES.invalid_role_title),
    holderName: z
      .string()
      .trim()
      .min(2, TERMS_ERROR_MESSAGES.invalid_holder_name)
      .max(100, TERMS_ERROR_MESSAGES.invalid_holder_name),
    startDate: z
      .string()
      .regex(ISO_DATE_REGEX, "Start date must be in YYYY-MM-DD format"),
    endDate: z
      .string()
      .regex(ISO_DATE_REGEX, "End date must be in YYYY-MM-DD format"),
    memberId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isUuid(val), "Invalid member ID format"),
  })
  .refine((data) => areDatesOrdered(data.startDate, data.endDate), {
    message: TERMS_ERROR_MESSAGES.invalid_dates,
    path: ["endDate"],
  });

export type OfficerTermInput = z.infer<typeof officerTermInputSchema>;
