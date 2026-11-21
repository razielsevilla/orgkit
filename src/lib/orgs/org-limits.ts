/**
 * Per-org caps. The database enforces these (create_invite raises
 * officer_limit_reached and invite_limit_reached); the app uses the same
 * numbers to hide the invite button and to word its messages. Change them in
 * both places together.
 */
export const MAX_OFFICERS_PER_ORG = 30;
export const MAX_PENDING_INVITES_PER_ORG = 30;
