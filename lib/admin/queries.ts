import { getSql, usePostgres } from "@/lib/db/pg";

export interface DashboardMetrics {
  todayNewUsers: number;
  todayPaidOrders: number;
  todayCreditsConsumed: number;
  totalRevenueCents: number;
}

export interface DailySignup {
  date: string;
  count: number;
}

export interface DailyConversion {
  date: string;
  signups: number;
  paidOrders: number;
  conversionRate: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string;
  balance: number;
  totalSpentCents: number;
  lastActiveAt: string | null;
}

export interface AdminTransactionRow {
  id: string;
  amount: number;
  type: string;
  referenceId: string | null;
  createdAt: string;
}

export interface AdminOrderRow {
  id: string;
  userId: string;
  userEmail: string;
  plan: string;
  amountCents: number;
  creditsAmount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function adminDbEnabled(): boolean {
  return usePostgres();
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const sql = getSql();
  const today = todayStartIso();

  const [users, orders, consumed, revenue] = await Promise.all([
    sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM users WHERE created_at >= ${today}::timestamptz
    `,
    sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.orders
       WHERE status = 'paid' AND paid_at >= ${today}::timestamptz
    `,
    sql<{ total: string }[]>`
      SELECT COALESCE(SUM(ABS(amount)), 0)::text AS total
        FROM public.credit_transactions
       WHERE type = 'consume' AND created_at >= ${today}::timestamptz
    `,
    sql<{ total: string }[]>`
      SELECT COALESCE(SUM(amount_cents), 0)::text AS total
        FROM public.orders WHERE status = 'paid'
    `,
  ]);

  return {
    todayNewUsers: Number(users[0]?.count ?? 0),
    todayPaidOrders: Number(orders[0]?.count ?? 0),
    todayCreditsConsumed: Number(consumed[0]?.total ?? 0),
    totalRevenueCents: Number(revenue[0]?.total ?? 0),
  };
}

export async function fetchSignupTrend(days = 7): Promise<DailySignup[]> {
  const sql = getSql();
  const rows = await sql<{ date: string; count: string }[]>`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
           COALESCE(COUNT(u.id), 0)::text AS count
      FROM generate_series(
             (CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day'))::date,
             CURRENT_DATE,
             INTERVAL '1 day'
           ) AS d(day)
      LEFT JOIN users u ON u.created_at::date = d.day
     GROUP BY d.day
     ORDER BY d.day
  `;
  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

export async function fetchConversionTrend(days = 7): Promise<DailyConversion[]> {
  const sql = getSql();
  const rows = await sql<{ date: string; signups: string; paid: string }[]>`
    WITH days AS (
      SELECT generate_series(
        (CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day'))::date,
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date AS day
    ),
    signups AS (
      SELECT created_at::date AS day, COUNT(*)::int AS cnt
        FROM users
       WHERE created_at::date >= (CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day'))::date
       GROUP BY 1
    ),
    paid AS (
      SELECT paid_at::date AS day, COUNT(*)::int AS cnt
        FROM public.orders
       WHERE status = 'paid'
         AND paid_at IS NOT NULL
         AND paid_at::date >= (CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day'))::date
       GROUP BY 1
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
           COALESCE(s.cnt, 0)::text AS signups,
           COALESCE(p.cnt, 0)::text AS paid
      FROM days d
      LEFT JOIN signups s ON s.day = d.day
      LEFT JOIN paid p ON p.day = d.day
     ORDER BY d.day
  `;

  return rows.map((r) => {
    const signups = Number(r.signups);
    const paidOrders = Number(r.paid);
    const conversionRate = signups > 0 ? Math.round((paidOrders / signups) * 1000) / 10 : 0;
    return { date: r.date, signups, paidOrders, conversionRate };
  });
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const sql = getSql();
  const rows = await sql<Record<string, unknown>[]>`
    SELECT
      u.id,
      u.email,
      u.created_at,
      COALESCE(uc.balance, 0) AS balance,
      COALESCE(spent.total_cents, 0) AS total_spent_cents,
      GREATEST(
        u.updated_at,
        COALESCE(uc.updated_at, u.updated_at),
        COALESCE(tx.last_tx, u.updated_at),
        COALESCE(r.last_report, u.updated_at)
      ) AS last_active_at
    FROM users u
    LEFT JOIN public.user_credits uc ON uc.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(amount_cents), 0) AS total_cents
        FROM public.orders
       WHERE user_id = u.id AND status = 'paid'
    ) spent ON true
    LEFT JOIN LATERAL (
      SELECT MAX(created_at) AS last_tx
        FROM public.credit_transactions
       WHERE user_id = u.id
    ) tx ON true
    LEFT JOIN LATERAL (
      SELECT MAX(created_at) AS last_report
        FROM reports
       WHERE user_id = u.id
    ) r ON true
    ORDER BY u.created_at DESC
    LIMIT 500
  `;

  return rows.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    balance: Number(row.balance),
    totalSpentCents: Number(row.total_spent_cents),
    lastActiveAt: row.last_active_at
      ? new Date(row.last_active_at as string).toISOString()
      : null,
  }));
}

export async function fetchUserTransactions(userId: string): Promise<AdminTransactionRow[]> {
  const sql = getSql();
  const rows = await sql<Record<string, unknown>[]>`
    SELECT id, amount, type, reference_id, created_at
      FROM public.credit_transactions
     WHERE user_id = ${userId}
     ORDER BY created_at DESC
     LIMIT 200
  `;
  return rows.map((r) => ({
    id: r.id as string,
    amount: r.amount as number,
    type: r.type as string,
    referenceId: (r.reference_id as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

export async function adjustUserCredits(input: {
  userId: string;
  delta: number;
  reason: string;
  adminEmail: string;
}): Promise<{ balance: number }> {
  const sql = getSql();
  const referenceId = `admin:${input.adminEmail}:${Date.now()}`;

  return sql.begin(async (tx) => {
    const current = await tx<{ balance: number }[]>`
      SELECT balance FROM public.user_credits
       WHERE user_id = ${input.userId}
       FOR UPDATE
    `;

    let balance = current[0]?.balance ?? 0;
    const next = balance + input.delta;
    if (next < 0) {
      throw new Error("Balance cannot be negative");
    }

    if (current.length === 0) {
      await tx`
        INSERT INTO public.user_credits (user_id, balance)
        VALUES (${input.userId}, ${next})
      `;
    } else {
      await tx`
        UPDATE public.user_credits SET balance = ${next}
         WHERE user_id = ${input.userId}
      `;
    }

    await tx`
      INSERT INTO public.credit_transactions (user_id, amount, type, reference_id)
      VALUES (
        ${input.userId},
        ${input.delta},
        'admin_adjust',
        ${`${referenceId}|${input.reason.slice(0, 200)}`}
      )
    `;

    balance = next;
    return { balance };
  });
}

export interface OrderFilters {
  status?: string;
  plan?: string;
  from?: string;
  to?: string;
}

export async function fetchAdminOrders(filters: OrderFilters = {}): Promise<AdminOrderRow[]> {
  const sql = getSql();

  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const plan = filters.plan && filters.plan !== "all" ? filters.plan : null;
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(filters.to) : null;

  const rows = await sql<Record<string, unknown>[]>`
    SELECT
      o.id,
      o.user_id,
      u.email AS user_email,
      o.plan,
      o.amount_cents,
      o.credits_amount,
      o.status,
      o.created_at,
      o.paid_at
    FROM public.orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE (${status}::text IS NULL OR o.status = ${status})
      AND (${plan}::text IS NULL OR o.plan = ${plan})
      AND (${from}::timestamptz IS NULL OR o.created_at >= ${from})
      AND (${to}::timestamptz IS NULL OR o.created_at <= ${to})
    ORDER BY o.created_at DESC
    LIMIT 500
  `;

  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    userEmail: (r.user_email as string) ?? "—",
    plan: r.plan as string,
    amountCents: r.amount_cents as number,
    creditsAmount: r.credits_amount as number,
    status: r.status as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    paidAt: r.paid_at ? new Date(r.paid_at as string).toISOString() : null,
  }));
}
