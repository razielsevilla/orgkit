/**
 * Consent text a student agrees to when joining an org (A4).
 *
 * Both the English and Filipino wording are approved. The privacy contact comes
 * from PRIVACY_CONTACT_EMAIL, and the join page stays closed while it is unset.
 *
 * Never edit a published version. Change the wording by adding a new version
 * and pointing CURRENT_MEMBER_CONSENT at it, so every stored record still maps
 * to the exact words that student saw.
 */

export type ConsentLanguage = "en" | "fil";

export interface MemberConsentVersion {
  version: string;
  text: Record<ConsentLanguage, string>;
}

export const APP_NAME = "OrgKit";

export const MEMBER_CONSENT_V1: MemberConsentVersion = {
  version: "member-consent-v1",
  text: {
    en:
      "By joining, you agree that {orgName} may collect and keep your full name and email address " +
      "using {appName}. They will use them only to manage membership, attendance and dues. " +
      "Officers of {orgName} can see your details; nobody else can. We do not collect anything else, " +
      "and your details are not sold or used for advertising. You can ask to see, correct or delete " +
      "your details by emailing {contactEmail}.",
    fil:
      "Sa pagsali, sumasang-ayon ka na maaaring kolektahin at itago ng {orgName} ang iyong buong pangalan " +
      "at email address gamit ang {appName}. Gagamitin lamang ang mga ito para sa pamamahala ng membership, " +
      "attendance at dues. Ang mga opisyal ng {orgName} lamang ang makakakita ng iyong mga detalye. " +
      "Wala nang ibang impormasyong kokolektahin, at hindi ibebenta o gagamitin sa advertising ang iyong mga detalye. " +
      "Maaari kang humiling na makita, itama o burahin ang iyong mga detalye sa pamamagitan ng pag-email sa {contactEmail}.",
  },
};

export const CURRENT_MEMBER_CONSENT = MEMBER_CONSENT_V1;

export function fillConsentText(
  template: string,
  values: { orgName: string; contactEmail: string }
): string {
  return template
    .replaceAll("{orgName}", values.orgName)
    .replaceAll("{appName}", APP_NAME)
    .replaceAll("{contactEmail}", values.contactEmail);
}

/** Copy for the public join page, in both languages. Messages are from the ticket. */
export const JOIN_COPY: Record<
  ConsentLanguage,
  {
    heading: (org: string) => string;
    fullName: string;
    email: string;
    agree: string;
    adult: string;
    privacyLink: string;
    join: string;
    joining: string;
    thanks: (org: string) => string;
  }
> = {
  en: {
    heading: (org) => `Join ${org}`,
    fullName: "Full name",
    email: "Email",
    agree: "I have read this and I agree",
    adult: "I am 18 or older",
    privacyLink: "Read the privacy notice",
    join: "Join",
    joining: "Joining…",
    thanks: (org) => `Thanks! You're on the list. Officers of ${org} will confirm your membership.`,
  },
  fil: {
    heading: (org) => `Sumali sa ${org}`,
    fullName: "Buong pangalan",
    email: "Email",
    agree: "Nabasa ko ito at sumasang-ayon ako",
    adult: "18 taong gulang pataas ako",
    privacyLink: "Basahin ang privacy notice",
    join: "Sumali",
    joining: "Sumasali…",
    thanks: (org) =>
      `Salamat! Nasa listahan ka na. Kukumpirmahin ng mga opisyal ng ${org} ang iyong membership.`,
  },
};
