import { JOIN_MESSAGES, cleanName, isValidName, isValidEmail } from "./member-join";

export const MEMBER_EDIT_MESSAGES = {
  nameInvalid: JOIN_MESSAGES.nameInvalid,
  emailInvalid: JOIN_MESSAGES.emailInvalid,
  duplicateEmail: "Someone in this org already uses that email.",
  saveFailed: "We couldn't save your changes. Please try again.",
  statusChangeFailed: "Could not update member status. Please try again.",
  notFound: "Member not found.",
  notPermitted: "You don't have permission to edit members of this organization.",
  deactivatePrompt: (name: string) =>
    `Deactivate ${name}? They'll move to Inactive. You can reactivate them later.`,
} as const;

export interface MemberEditInput {
  fullName: string;
  email: string;
}

export interface MemberEditValidationResult {
  valid: boolean;
  fullName: string;
  email: string;
  error?: string;
  field?: "fullName" | "email";
}

/**
 * Validates member edit input against R2 acceptance criteria:
 * - Name between 2 and 100 characters.
 * - Valid email format and <= 254 characters.
 */
export function validateMemberEdit(input: MemberEditInput): MemberEditValidationResult {
  const cleanedName = cleanName(input.fullName ?? "");
  const cleanedEmail = (input.email ?? "").trim();

  if (!isValidName(cleanedName)) {
    return {
      valid: false,
      fullName: cleanedName,
      email: cleanedEmail,
      error: MEMBER_EDIT_MESSAGES.nameInvalid,
      field: "fullName",
    };
  }

  if (!isValidEmail(cleanedEmail)) {
    return {
      valid: false,
      fullName: cleanedName,
      email: cleanedEmail,
      error: MEMBER_EDIT_MESSAGES.emailInvalid,
      field: "email",
    };
  }

  return {
    valid: true,
    fullName: cleanedName,
    email: cleanedEmail,
  };
}

