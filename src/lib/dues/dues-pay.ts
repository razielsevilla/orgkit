export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type DuesPayLanguage = "en" | "fil";

export const DUES_PAY_MESSAGES = {
  en: {
    title: "Pay dues",
    subtitle: "Submit your GCash reference number and proof of payment.",
    amountLabel: "Amount to pay",
    dueOnLabel: "Due on",
    emailLabel: "Roster email",
    emailPlaceholder: "student@school.edu",
    emailHint: "Enter the email address registered with your organization.",
    referenceLabel: "GCash reference number",
    referencePlaceholder: "e.g. 1001 2345 6789",
    referenceHint: "Found in your GCash receipt SMS or confirmation screen.",
    screenshotLabel: "Payment screenshot",
    screenshotHint: "JPEG, PNG or WebP up to 5 MB",
    screenshotSelect: "Select photo or tap to take photo",
    screenshotChange: "Change screenshot",
    privacyNotice:
      "Your screenshot is stored securely and will only be reviewed by officers of this organization to verify payment.",
    submit: "Submit payment",
    submitting: "Submitting proof...",
    successTitle: "Payment submitted!",
    successSubtitle:
      "Your payment proof has been submitted. An officer will review and verify your payment.",
    successReference: "Reference number",
    successOrg: "Organization",
    successPeriod: "Dues period",
    successDone: "You may now close this window.",
    inactiveTitle: "Payment link isn't active",
    inactiveDescription:
      "This dues period is either closed or the payment link is paused. Please reach out to your organization officers if you need assistance.",
    // Validation & Error messages
    emailInvalid: "Please enter a valid email address.",
    referenceInvalid: "Please enter a valid reference number (4 to 50 characters).",
    screenshotMissing: "Please upload a screenshot of your payment receipt.",
    screenshotTooLarge: "Screenshot exceeds the 5 MB file size limit.",
    screenshotInvalidType: "Only JPEG, PNG, or WebP images are allowed.",
    alreadySubmitted:
      "You already have a submitted or verified payment for this dues period.",
    referenceUsed:
      "This reference number has already been used in this organization. If this is an error, please contact an officer.",
    memberNotEligible:
      "This email was not found on the active member roster. Please check your email or contact an officer.",
    tooMany: "Too many attempts. Please wait a minute and try again.",
    saveFailed: "We couldn't submit your payment. Please try again.",
  },
  fil: {
    title: "Magbayad ng dues",
    subtitle: "I-submit ang iyong GCash reference number at resibo ng bayad.",
    amountLabel: "Halagang babayaran",
    dueOnLabel: "Huling araw",
    emailLabel: "Email sa roster",
    emailPlaceholder: "estudyante@paaralan.edu",
    emailHint: "Ilagay ang email na nakatala sa iyong organisasyon.",
    referenceLabel: "GCash reference number",
    referencePlaceholder: "hal. 1001 2345 6789",
    referenceHint: "Makikita sa GCash SMS o screenshot ng resibo.",
    screenshotLabel: "Screenshot ng bayad",
    screenshotHint: "JPEG, PNG o WebP hanggang 5 MB",
    screenshotSelect: "Pumili ng larawan o kumuha ng litrato",
    screenshotChange: "Palitan ang screenshot",
    privacyNotice:
      "Ligtas na itinatago ang iyong resibo at makikita lamang ng mga opisyal upang patotohanan ang bayad.",
    submit: "I-submit ang bayad",
    submitting: "Isinusumite ang resibo...",
    successTitle: "Na-submit na ang bayad!",
    successSubtitle:
      "Naisumite na ang iyong resibo. Ibeberipika ito ng isang opisyal.",
    successReference: "Reference number",
    successOrg: "Organisasyon",
    successPeriod: "Dues period",
    successDone: "Maaari mo nang isara ang window na ito.",
    inactiveTitle: "Hindi aktibo ang link",
    inactiveDescription:
      "Sarado na ang dues period na ito o naka-pause ang link ng pagbabayad. Makipag-ugnayan sa iyong mga opisyal kung kailangan ng tulong.",
    // Validation & Error messages
    emailInvalid: "Pakilagay ang isang wastong email address.",
    referenceInvalid: "Pakilagay ang wastong reference number (4 hanggang 50 titik o numero).",
    screenshotMissing: "Paki-upload ang screenshot ng iyong resibo.",
    screenshotTooLarge: "Lumagpas sa 5 MB ang laki ng screenshot.",
    screenshotInvalidType: "JPEG, PNG, o WebP lamang ang pinapayagan.",
    alreadySubmitted:
      "Mayroon ka nang naisumite o nabeberipikang bayad para sa period na ito.",
    referenceUsed:
      "Nagamit na ang reference number na ito sa organisasyon. Kung ito ay mali, makipag-ugnayan sa opisyal.",
    memberNotEligible:
      "Hindi nahanap ang email na ito sa aktibong roster. Pakisuri ang email o makipag-ugnayan sa opisyal.",
    tooMany: "Masyadong maraming pagsubok. Maghintay muna ng isang minuto bago sumubok muli.",
    saveFailed: "Hindi ma-submit ang iyong bayad. Pakisubukan muli.",
  },
} as const;

// Matches valid email format: user@domain.tld with at least 2 letters in the TLD
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

export function cleanReferenceNo(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isValidReferenceNo(ref: string): boolean {
  const cleaned = cleanReferenceNo(ref);
  return cleaned.length >= 4 && cleaned.length <= 50;
}

export function looksLikeToken(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token);
}

export function isValidScreenshotFile(file: { size: number; type: string }): {
  valid: boolean;
  errorKey?: "screenshotMissing" | "screenshotTooLarge" | "screenshotInvalidType";
} {
  if (!file || file.size === 0) {
    return { valid: false, errorKey: "screenshotMissing" };
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { valid: false, errorKey: "screenshotTooLarge" };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    return { valid: false, errorKey: "screenshotInvalidType" };
  }
  return { valid: true };
}
