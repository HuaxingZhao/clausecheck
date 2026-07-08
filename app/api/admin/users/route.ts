import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import {
  adminDbEnabled,
  adjustUserCredits,
  fetchAdminUsers,
  fetchUserTransactions,
} from "@/lib/admin/queries";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!adminDbEnabled()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const users = await fetchAdminUsers();
    return NextResponse.json({ users });
  } catch (err: unknown) {
    console.error("admin users list error:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

const adjustSchema = z.object({
  user_id: z.string().uuid(),
  delta: z.number().int().refine((n) => n !== 0, "delta must be non-zero"),
  reason: z.string().trim().min(2).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!adminDbEnabled()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { user_id, delta, reason } = parsed.data;
    const result = await adjustUserCredits({
      userId: user_id,
      delta,
      reason,
      adminEmail: auth.admin.email,
    });

    return NextResponse.json({ balance: result.balance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Adjust failed";
    console.error("admin adjust credits error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  if (!adminDbEnabled()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const transactions = await fetchUserTransactions(userId);
    return NextResponse.json({ transactions });
  } catch (err: unknown) {
    console.error("admin user transactions error:", err);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
