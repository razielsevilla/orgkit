import { z } from "zod";

export const reviewReasonSchema = z
  .string({ required_error: "Reason is required." })
  .trim()
  .min(3, "Reason must be at least 3 characters.")
  .max(500, "Reason cannot exceed 500 characters.");

export interface ReviewReasonValidationResult {
  isValid: boolean;
  error?: string;
  cleaned?: string;
}

export function validateReviewReason(reason: unknown): ReviewReasonValidationResult {
  const result = reviewReasonSchema.safeParse(reason);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      isValid: false,
      error: firstIssue?.message ?? "Invalid reason.",
    };
  }

  return {
    isValid: true,
    cleaned: result.data,
  };
}
