import type { ConsentLanguage } from "@/src/lib/members/member-consent";

/**
 * Wording of the public check-in page, in English and Filipino. The server only
 * sends back a status; the page picks the words, so a message can never carry
 * anything about the roster. No imports besides a type, so tests can load it.
 */
export interface CheckinCopy {
  heading: string;
  subtitle: string;
  email: string;
  submit: string;
  submitting: string;
  successTitle: (firstName: string) => string;
  successNote: string;
  alreadyTitle: string;
  alreadyNote: string;
  expiredTitle: string;
  expired: string;
  failed: string;
  tooMany: string;
  saveFailed: string;
  emailInvalid: string;
}

export const CHECKIN_COPY: Record<ConsentLanguage, CheckinCopy> = {
  en: {
    heading: "Check in",
    subtitle: "Enter the email you joined with to record your attendance.",
    email: "Email",
    submit: "Check in",
    submitting: "Checking in…",
    successTitle: (firstName) => `You're checked in, ${firstName}`,
    successNote: "Your attendance is recorded. You can safely close this page.",
    alreadyTitle: "You're already checked in",
    alreadyNote: "Your attendance was already recorded. You can safely close this page.",
    expiredTitle: "Link isn't active",
    expired: "This check-in link has expired or is closed. Scan the code on screen again.",
    failed:
      "We couldn't check you in. Use the email you joined with, or ask an officer.",
    tooMany: "Too many attempts. Please slow down and try again in a minute.",
    saveFailed: "Something went wrong. Please try again.",
    emailInvalid: "Enter a valid email address.",
  },
  fil: {
    heading: "Mag-check in",
    subtitle: "Ilagay ang email na ginamit mo sa pagsali para maitala ang iyong attendance.",
    email: "Email",
    submit: "Mag-check in",
    submitting: "Nagche-check in…",
    successTitle: (firstName) => `Naka-check in ka na, ${firstName}`,
    successNote: "Naitala na ang iyong attendance. Maaari mo nang isara ang page na ito.",
    alreadyTitle: "Naka-check in ka na",
    alreadyNote: "Naitala na ang iyong attendance. Maaari mo nang isara ang page na ito.",
    expiredTitle: "Hindi na aktibo ang link",
    expired:
      "Nag-expire o sarado na ang check-in link na ito. I-scan muli ang code sa screen.",
    failed:
      "Hindi ka namin ma-check in. Gamitin ang email na ginamit mo sa pagsali, o magtanong sa isang opisyal.",
    tooMany: "Napakaraming subok. Dahan-dahan lang at subukan muli pagkalipas ng isang minuto.",
    saveFailed: "May nangyaring mali. Pakisubukan muli.",
    emailInvalid: "Maglagay ng wastong email address.",
  },
};
