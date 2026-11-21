import { z } from "zod";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export const reminderPreviewQuerySchema = z.object({
  orgId: z.string().refine(isUuid, { message: "Invalid organization ID" }),
  periodId: z.string().refine(isUuid, { message: "Invalid period ID" }),
});

export type ValidatedReminderPreviewQuery = z.infer<
  typeof reminderPreviewQuerySchema
>;

export const sendRemindersSchema = z.object({
  orgId: z.string().refine(isUuid, { message: "Invalid organization ID" }),
  periodId: z.string().refine(isUuid, { message: "Invalid period ID" }),
});

export type ValidatedSendRemindersInput = z.infer<typeof sendRemindersSchema>;

export const retryRemindersSchema = z.object({
  orgId: z.string().refine(isUuid, { message: "Invalid organization ID" }),
  periodId: z.string().refine(isUuid, { message: "Invalid period ID" }),
  memberIds: z
    .array(z.string().refine(isUuid, { message: "Invalid member ID" }))
    .min(1, "At least one member ID must be provided to retry")
    .max(500, "Cannot retry more than 500 members in one request"),
});

export type ValidatedRetryRemindersInput = z.infer<typeof retryRemindersSchema>;

export interface ReminderValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

export function validateReminderPreviewQuery(
  input: unknown
): ReminderValidationResult<ValidatedReminderPreviewQuery> {
  const result = reminderPreviewQuerySchema.safeParse(input);
  if (!result.success) {
    return {
      isValid: false,
      error: result.error.issues[0]?.message ?? "Invalid reminder preview query.",
    };
  }
  return { isValid: true, data: result.data };
}

export function validateSendReminders(
  input: unknown
): ReminderValidationResult<ValidatedSendRemindersInput> {
  const result = sendRemindersSchema.safeParse(input);
  if (!result.success) {
    return {
      isValid: false,
      error: result.error.issues[0]?.message ?? "Invalid send reminders parameters.",
    };
  }
  return { isValid: true, data: result.data };
}

export function validateRetryReminders(
  input: unknown
): ReminderValidationResult<ValidatedRetryRemindersInput> {
  const result = retryRemindersSchema.safeParse(input);
  if (!result.success) {
    return {
      isValid: false,
      error: result.error.issues[0]?.message ?? "Invalid retry reminders parameters.",
    };
  }
  return { isValid: true, data: result.data };
}
