import { z } from "zod";
import { isUuid } from "@/src/lib/validation";
import { DUES_PAGE_SIZE, DUES_STATUS_FILTERS, type DuesStatusFilter } from "./dues-dashboard";

export const dashboardQuerySchema = z.object({
  periodId: z.string().refine(isUuid, { message: "Invalid period ID" }),
  search: z.string().trim().max(100, "Search query is too long").optional().default(""),
  status: z.enum(DUES_STATUS_FILTERS).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(DUES_PAGE_SIZE),
});

export type ValidatedDashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface DashboardQueryValidationResult {
  isValid: boolean;
  data?: ValidatedDashboardQuery;
  error?: string;
}

export function validateDashboardQuery(input: unknown): DashboardQueryValidationResult {
  const result = dashboardQuerySchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      isValid: false,
      error: firstIssue?.message ?? "Invalid dashboard query parameters.",
    };
  }

  return {
    isValid: true,
    data: result.data,
  };
}
