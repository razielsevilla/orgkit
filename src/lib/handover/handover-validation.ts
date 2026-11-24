import { z } from "zod";
import { isUuid } from "../validation.ts";

export const HANDOVER_ERROR_MESSAGES = {
  not_found: "Handover guide not found.",
  not_authorized: "You do not have permission to view this handover guide.",
  forbidden_edit: "This guide is finalized and cannot be edited unless reopened by an admin.",
  invalid_role: "Please specify a valid officer role title.",
  section_too_long: "Section text cannot exceed 5000 characters.",
  invalid_document_link: "One or more attached document links are invalid.",
  failed: "An unexpected error occurred. Please try again.",
} as const;

export type HandoverActionError = keyof typeof HANDOVER_ERROR_MESSAGES;

export const saveHandoverGuideSchema = z.object({
  guideId: z.string().refine(isUuid, { message: "Invalid guide ID" }).optional(),
  roleTitle: z
    .string()
    .trim()
    .min(2, "Role title must be at least 2 characters.")
    .max(100, "Role title cannot exceed 100 characters."),
  termId: z
    .string()
    .refine(isUuid, { message: "Invalid term ID" })
    .nullable()
    .optional(),
  sections: z.object({
    what_i_do: z.string().max(5000, HANDOVER_ERROR_MESSAGES.section_too_long).default(""),
    recurring_tasks: z.string().max(5000, HANDOVER_ERROR_MESSAGES.section_too_long).default(""),
    key_contacts: z.string().max(5000, HANDOVER_ERROR_MESSAGES.section_too_long).default(""),
    open_items: z.string().max(5000, HANDOVER_ERROR_MESSAGES.section_too_long).default(""),
    where_things_are: z.string().max(5000, HANDOVER_ERROR_MESSAGES.section_too_long).default(""),
    linked_document_ids: z.array(z.string().refine(isUuid)).default([]),
  }),
});

export type SaveHandoverGuideInput = z.infer<typeof saveHandoverGuideSchema>;

export const setHandoverStatusSchema = z.object({
  guideId: z.string().refine(isUuid, { message: "Invalid guide ID" }),
  status: z.enum(["draft", "ready"], {
    message: "Status must be either draft or ready.",
  }),
});

export type SetHandoverStatusInput = z.infer<typeof setHandoverStatusSchema>;
