import { getSql, usePostgres, ensureSchema } from "@/lib/db/pg";

const EXPERIENCE_WORD_LIMIT = 20_000;

export { EXPERIENCE_WORD_LIMIT };

export function creditsSystemEnabled(): boolean {
  return usePostgres();
}

/** Current balance; returns 0 when no row exists. */
export async function getUserCreditBalance(userId: string): Promise<number> {
  if (!usePostgres()) return 0;
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<{ balance: number | null }[]>`
    SELECT balance
      FROM public.user_credits
     WHERE user_id = ${userId}
     LIMIT 1
  `;
  return rows[0]?.balance ?? 0;
}

/** Call atomic consume_credit RPC; returns false when balance insufficient. */
export async function consumeUserCredit(userId: string): Promise<boolean> {
  if (!usePostgres()) return false;
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<{ ok: boolean }[]>`
    SELECT public.consume_credit(${userId}) AS ok
  `;
  return rows[0]?.ok === true;
}

/** Restore one credit after a failed AI pass (ledger + balance). */
export async function refundUserCredit(
  userId: string,
  referenceId?: string | null
): Promise<void> {
  if (!usePostgres()) return;
  await ensureSchema();
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      UPDATE public.user_credits
         SET balance = balance + 1
       WHERE user_id = ${userId}
    `;
    await tx`
      INSERT INTO public.credit_transactions (user_id, amount, type, reference_id)
      VALUES (${userId}, 1, 'refund', ${referenceId ?? null})
    `;
  });
}

/**
 * 体验版：仅有注册赠送额度、无 purchase/invite 流水，且非 Pro 订阅。
 */
export async function isExperienceUser(userId: string, isPro: boolean): Promise<boolean> {
  if (isPro || !usePostgres()) return false;
  await ensureSchema();
  const sql = getSql();
  const paid = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
        FROM public.credit_transactions
       WHERE user_id = ${userId}
         AND type IN ('purchase', 'invite')
    ) AS exists
  `;
  return paid[0]?.exists !== true;
}

export async function assertExperienceWordLimit(
  userId: string,
  charCount: number,
  isPro: boolean
): Promise<{ ok: true } | { ok: false; limit: number }> {
  const experience = await isExperienceUser(userId, isPro);
  if (!experience) return { ok: true };
  if (charCount > EXPERIENCE_WORD_LIMIT) {
    return { ok: false, limit: EXPERIENCE_WORD_LIMIT };
  }
  return { ok: true };
}
