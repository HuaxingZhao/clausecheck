import { getSql, usePostgres } from "@/lib/db/pg";
import type { TopupPlan } from "./plans";
import { getTopupPlan } from "./plans";
import { isMockWechatPayAllowed } from "@/lib/credits/mock-pay";

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface CreditOrder {
  id: string;
  userId: string;
  plan: TopupPlan;
  paymentMethod: "wechat";
  amountCents: number;
  creditsAmount: number;
  status: OrderStatus;
  providerTradeNo: string | null;
  paymentUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

function rowToOrder(r: Record<string, unknown>): CreditOrder {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    plan: r.plan as TopupPlan,
    paymentMethod: r.payment_method as "wechat",
    amountCents: r.amount_cents as number,
    creditsAmount: r.credits_amount as number,
    status: r.status as OrderStatus,
    providerTradeNo: (r.provider_trade_no as string) ?? null,
    paymentUrl: (r.payment_url as string) ?? null,
    paidAt: r.paid_at ? new Date(r.paid_at as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export function buildWechatPaymentUrl(
  orderId: string,
  amountCents: number,
  requestOrigin?: string
): string {
  const base = (requestOrigin || process.env.NEXT_PUBLIC_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const externalQr = process.env.WECHAT_PAY_QR_BASE?.trim();
  if (externalQr) {
    return `${externalQr.replace(/\/$/, "")}?order_id=${orderId}&amount_cents=${amountCents}`;
  }

  if (!isMockWechatPayAllowed()) {
    throw new Error(
      "WeChat pay is not configured in production. Set WECHAT_PAY_QR_BASE to a real cashier, or ALLOW_MOCK_WECHAT_PAY=1 only for controlled demos."
    );
  }
  return `${base}/api/webhooks/payment/mock-qr?order_id=${orderId}&amount_cents=${amountCents}`;
}

export async function createPendingOrder(input: {
  userId: string;
  plan: TopupPlan;
  paymentMethod: "wechat";
  requestOrigin?: string;
}): Promise<CreditOrder> {
  if (!usePostgres()) {
    throw new Error("DATABASE_URL not configured");
  }

  const cfg = getTopupPlan(input.plan);
  const sql = getSql();
  const orderId = crypto.randomUUID();
  const paymentUrl = buildWechatPaymentUrl(orderId, cfg.amountCents, input.requestOrigin);

  const rows = await sql`
    INSERT INTO public.orders (
      id, user_id, plan, payment_method, amount_cents, credits_amount, status, payment_url
    ) VALUES (
      ${orderId}::uuid,
      ${input.userId},
      ${input.plan},
      ${input.paymentMethod},
      ${cfg.amountCents},
      ${cfg.creditsAmount},
      'pending',
      ${paymentUrl}
    )
    RETURNING *
  `;

  return rowToOrder(rows[0] as Record<string, unknown>);
}

export async function getOrderById(orderId: string): Promise<CreditOrder | null> {
  if (!usePostgres()) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM public.orders WHERE id = ${orderId}::uuid LIMIT 1
  `;
  return rows[0] ? rowToOrder(rows[0] as Record<string, unknown>) : null;
}

/** Lightweight status poll for payment UI; null if missing or not owned. */
export async function getOrderStatusForUser(
  orderId: string,
  userId: string
): Promise<OrderStatus | null> {
  if (!usePostgres()) return null;
  const sql = getSql();
  const rows = await sql<{ status: OrderStatus }[]>`
    SELECT status
      FROM public.orders
     WHERE id = ${orderId}::uuid
       AND user_id = ${userId}
     LIMIT 1
  `;
  return rows[0]?.status ?? null;
}

export type FulfillOrderResult = "fulfilled" | "already_paid" | "not_found" | "invalid_state";

/**
 * Idempotent fulfillment: duplicate calls for the same paid order return already_paid.
 */
export async function fulfillCreditOrder(
  orderId: string,
  providerTradeNo: string
): Promise<FulfillOrderResult> {
  if (!usePostgres()) {
    throw new Error("DATABASE_URL not configured");
  }

  const sql = getSql();

  return sql.begin(async (tx) => {
    const rows = await tx`
      SELECT * FROM public.orders WHERE id = ${orderId}::uuid FOR UPDATE
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return "not_found";

    const status = row.status as OrderStatus;
    if (status === "paid") return "already_paid";
    if (status !== "pending") return "invalid_state";

    const userId = row.user_id as string;
    const creditsAmount = row.credits_amount as number;

    await tx`
      UPDATE public.orders
         SET status = 'paid',
             provider_trade_no = ${providerTradeNo},
             paid_at = now(),
             updated_at = now()
       WHERE id = ${orderId}::uuid
    `;

    await tx`
      INSERT INTO public.user_credits (user_id, balance)
      VALUES (${userId}, ${creditsAmount})
      ON CONFLICT (user_id) DO UPDATE
        SET balance = public.user_credits.balance + EXCLUDED.balance
    `;

    await tx`
      INSERT INTO public.credit_transactions (user_id, amount, type, reference_id)
      VALUES (${userId}, ${creditsAmount}, 'purchase', ${orderId})
      ON CONFLICT (reference_id) WHERE type = 'purchase' DO NOTHING
    `;

    return "fulfilled";
  });
}
