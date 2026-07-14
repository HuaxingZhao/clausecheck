/**
 * Invite referral rewards — extra document-review credits (add-on style),
 * NOT the Plan A signup trial (getQuotaForPlan("trial") === 1).
 * Keep product copy in messages invite.* strings aligned with these numbers.
 */
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_MAX_USES = 50;
/** Extra reviews granted to the inviter per successful referral. */
export const INVITE_CREDITS_INVITER = 3;
/** Extra reviews granted to the invitee on successful referral redeem. */
export const INVITE_CREDITS_INVITEE = 3;
export const INVITE_GUARD_WINDOW_MS = 24 * 60 * 60 * 1000;

export const INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
