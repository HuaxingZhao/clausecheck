import { ensureSchema, getSql, usePostgres } from "@/lib/db/pg";
import { grantAddonDocumentQuota } from "@/lib/db/document-quota";
import {
  INVITE_CODE_CHARS,
  INVITE_CODE_LENGTH,
  INVITE_CODE_MAX_USES,
  INVITE_CREDITS_INVITEE,
  INVITE_CREDITS_INVITER,
  INVITE_GUARD_WINDOW_MS,
} from "./constants";

export type InviteRedeemErrorCode =
  | "INVALID_CODE"
  | "CODE_EXHAUSTED"
  | "SELF_INVITE"
  | "ALREADY_REDEEMED"
  | "DEVICE_RATE_LIMIT"
  | "IP_RATE_LIMIT"
  | "SYSTEM_UNAVAILABLE";

export class InviteRedeemError extends Error {
  readonly code: InviteRedeemErrorCode;

  constructor(code: InviteRedeemErrorCode, message: string) {
    super(message);
    this.name = "InviteRedeemError";
    this.code = code;
  }
}

export interface InviteCodeRow {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
  usedBy: string | null;
  useCount: number;
}

export interface InviteStats {
  code: string | null;
  inviteCount: number;
  creditsEarned: number;
}

function rowToInviteCode(r: Record<string, unknown>): InviteCodeRow {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    code: (r.code as string).trim(),
    createdAt: new Date(r.created_at as string).toISOString(),
    usedBy: (r.used_by as string) ?? null,
    useCount: r.use_count as number,
  };
}

function randomInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  let out = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    out += INVITE_CODE_CHARS[bytes[i]! % INVITE_CODE_CHARS.length];
  }
  return out;
}

/** Ensure new user has starter balance when auth trigger is absent. */
export async function bootstrapNewUserCredits(userId: string): Promise<void> {
  if (!usePostgres()) return;
  const sql = getSql();
  await sql.begin(async (tx) => {
    const existing = await tx`
      SELECT 1 FROM public.user_credits WHERE user_id = ${userId} LIMIT 1
    `;
    if (existing.length > 0) return;

    await tx`
      INSERT INTO public.user_credits (user_id, balance)
      VALUES (${userId}, 3)
    `;
    await tx`
      INSERT INTO public.credit_transactions (user_id, amount, type)
      VALUES (${userId}, 3, 'register')
    `;
  });
}

/** Return existing code or create a unique 6-char code for the user. */
export async function getOrCreateInviteCode(userId: string): Promise<InviteCodeRow> {
  if (!usePostgres()) {
    throw new InviteRedeemError("SYSTEM_UNAVAILABLE", "Invite system unavailable");
  }

  await ensureSchema();
  const sql = getSql();
  const existing = await sql`
    SELECT * FROM public.invite_codes WHERE user_id = ${userId} LIMIT 1
  `;
  if (existing[0]) {
    return rowToInviteCode(existing[0] as Record<string, unknown>);
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomInviteCode();
    try {
      const rows = await sql`
        INSERT INTO public.invite_codes (user_id, code)
        VALUES (${userId}, ${code})
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
      `;
      if (rows[0]) {
        return rowToInviteCode(rows[0] as Record<string, unknown>);
      }
      const again = await sql`
        SELECT * FROM public.invite_codes WHERE user_id = ${userId} LIMIT 1
      `;
      if (again[0]) {
        return rowToInviteCode(again[0] as Record<string, unknown>);
      }
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") continue;
      throw err;
    }
  }

  throw new Error("Failed to allocate invite code");
}

export async function getInviteStats(userId: string): Promise<InviteStats> {
  if (!usePostgres()) {
    return { code: null, inviteCount: 0, creditsEarned: 0 };
  }

  await ensureSchema();
  const sql = getSql();
  const codeRows = await sql`
    SELECT * FROM public.invite_codes WHERE user_id = ${userId} LIMIT 1
  `;
  const codeRow = codeRows[0]
    ? rowToInviteCode(codeRows[0] as Record<string, unknown>)
    : null;

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
      FROM public.invite_redemptions r
      JOIN public.invite_codes c ON c.id = r.invite_code_id
     WHERE c.user_id = ${userId}
  `;

  const creditRows = await sql<{ total: string | null }[]>`
    SELECT COALESCE(SUM(amount), 0)::text AS total
      FROM public.credit_transactions
     WHERE user_id = ${userId}
       AND type = 'invite'
  `;

  return {
    code: codeRow?.code ?? null,
    inviteCount: Number(countRows[0]?.count ?? 0),
    creditsEarned: Number(creditRows[0]?.total ?? 0),
  };
}

export async function redeemInviteCode(input: {
  code: string;
  redeemerUserId: string;
  deviceKey: string;
  ipKey: string;
}): Promise<{ inviterUserId: string; creditsGranted: number }> {
  if (!usePostgres()) {
    throw new InviteRedeemError("SYSTEM_UNAVAILABLE", "Invite system unavailable");
  }

  await ensureSchema();
  const code = input.code.trim().toUpperCase();
  const sql = getSql();
  const guardSince = new Date(Date.now() - INVITE_GUARD_WINDOW_MS).toISOString();

  return sql.begin(async (tx) => {
    const codeRows = await tx`
      SELECT * FROM public.invite_codes WHERE code = ${code} FOR UPDATE
    `;
    const inviteRow = codeRows[0] as Record<string, unknown> | undefined;
    if (!inviteRow) {
      throw new InviteRedeemError("INVALID_CODE", "Invite code not found");
    }

    const invite = rowToInviteCode(inviteRow);
    if (invite.useCount >= INVITE_CODE_MAX_USES) {
      throw new InviteRedeemError("CODE_EXHAUSTED", "Invite code has reached its usage limit");
    }
    if (invite.userId === input.redeemerUserId) {
      throw new InviteRedeemError("SELF_INVITE", "Cannot redeem your own invite code");
    }

    const priorRedeem = await tx`
      SELECT 1 FROM public.invite_redemptions
       WHERE redeemer_user_id = ${input.redeemerUserId}
       LIMIT 1
    `;
    if (priorRedeem.length > 0) {
      throw new InviteRedeemError("ALREADY_REDEEMED", "This account has already redeemed an invite");
    }

    const deviceHit = await tx`
      SELECT 1 FROM public.invite_redemptions
       WHERE device_key = ${input.deviceKey}
         AND created_at > ${guardSince}::timestamptz
       LIMIT 1
    `;
    if (deviceHit.length > 0) {
      throw new InviteRedeemError("DEVICE_RATE_LIMIT", "This device recently redeemed an invite");
    }

    const ipHit = await tx`
      SELECT 1 FROM public.invite_redemptions
       WHERE ip_key = ${input.ipKey}
         AND created_at > ${guardSince}::timestamptz
       LIMIT 1
    `;
    if (ipHit.length > 0) {
      throw new InviteRedeemError("IP_RATE_LIMIT", "This network recently redeemed an invite");
    }

    const referenceId = `${code}:${input.redeemerUserId}`;

    await tx`
      INSERT INTO public.invite_redemptions (
        invite_code_id, redeemer_user_id, device_key, ip_key
      ) VALUES (
        ${invite.id},
        ${input.redeemerUserId},
        ${input.deviceKey},
        ${input.ipKey}
      )
    `;

    await tx`
      UPDATE public.invite_codes
         SET use_count = use_count + 1,
             used_by = ${input.redeemerUserId}
       WHERE id = ${invite.id}
    `;

    await tx`
      INSERT INTO public.user_credits (user_id, balance)
      VALUES (${input.redeemerUserId}, ${INVITE_CREDITS_INVITEE})
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_credits.balance + ${INVITE_CREDITS_INVITEE}
    `;
    await tx`
      INSERT INTO public.credit_transactions (user_id, amount, type, reference_id)
      VALUES (
        ${input.redeemerUserId},
        ${INVITE_CREDITS_INVITEE},
        'register',
        ${referenceId}
      )
      ON CONFLICT (reference_id) WHERE type = 'register' AND reference_id IS NOT NULL
      DO NOTHING
    `;

    await tx`
      INSERT INTO public.user_credits (user_id, balance)
      VALUES (${invite.userId}, ${INVITE_CREDITS_INVITER})
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_credits.balance + ${INVITE_CREDITS_INVITER}
    `;
    await tx`
      INSERT INTO public.credit_transactions (user_id, amount, type, reference_id)
      VALUES (
        ${invite.userId},
        ${INVITE_CREDITS_INVITER},
        'invite',
        ${referenceId}
      )
      ON CONFLICT (reference_id) WHERE type = 'invite' AND reference_id IS NOT NULL
      DO NOTHING
    `;

    return {
      inviterUserId: invite.userId,
      creditsGranted: INVITE_CREDITS_INVITEE,
    };
  }).then(async (result) => {
    await Promise.all([
      grantAddonDocumentQuota(input.redeemerUserId, INVITE_CREDITS_INVITEE),
      grantAddonDocumentQuota(result.inviterUserId, INVITE_CREDITS_INVITER),
    ]);
    return result;
  });
}
