export interface DuesPeriodInput {
  name: string;
  amount: number | string;
  dueOn: string;
}

export interface DuesPeriodValidationErrors {
  name?: string;
  amount?: string;
  dueOn?: string;
}

export function validateDuesPeriodInput(input: {
  name?: string | null;
  amount?: number | string | null;
  dueOn?: string | null;
}): {
  isValid: boolean;
  errors: DuesPeriodValidationErrors;
  cleaned?: {
    name: string;
    amount: number;
    dueOn: string;
  };
} {
  const errors: DuesPeriodValidationErrors = {};

  // 1. Name validation (2–100 characters)
  const trimmedName = (input.name ?? "").trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    errors.name = "Name must be between 2 and 100 characters.";
  }

  // 2. Amount validation (> 0, <= 100,000, max 2 decimals)
  let numericAmount: number | null = null;
  if (input.amount === null || input.amount === undefined || input.amount === "") {
    errors.amount = "Amount is required.";
  } else {
    const rawStr = String(input.amount).trim().replace(/^₱\s*/, "").replace(/,/g, "");
    const parsed = Number(rawStr);
    if (isNaN(parsed)) {
      errors.amount = "Amount must be a valid number.";
    } else if (parsed <= 0) {
      errors.amount = "Amount must be greater than ₱0.";
    } else if (parsed > 100000) {
      errors.amount = "Amount cannot exceed ₱100,000.";
    } else {
      // Check decimal places
      const parts = rawStr.split(".");
      if (parts.length > 1 && parts[1].length > 2) {
        errors.amount = "Amount can have at most 2 decimal places.";
      } else {
        numericAmount = Math.round(parsed * 100) / 100;
      }
    }
  }

  // 3. Due date validation (valid date string)
  const rawDueOn = (input.dueOn ?? "").trim();
  if (!rawDueOn) {
    errors.dueOn = "Please enter a valid due date.";
  } else {
    const dateObj = new Date(rawDueOn);
    if (isNaN(dateObj.getTime())) {
      errors.dueOn = "Please enter a valid due date.";
    }
  }

  const isValid = Object.keys(errors).length === 0;

  if (isValid && numericAmount !== null) {
    return {
      isValid: true,
      errors: {},
      cleaned: {
        name: trimmedName,
        amount: numericAmount,
        dueOn: rawDueOn,
      },
    };
  }

  return { isValid: false, errors };
}
