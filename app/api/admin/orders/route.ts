import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminDbEnabled, fetchAdminOrders } from "@/lib/admin/queries";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!adminDbEnabled()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  const filters = {
    status: sp.get("status") ?? undefined,
    plan: sp.get("plan") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };

  try {
    const orders = await fetchAdminOrders(filters);
    return NextResponse.json({ orders });
  } catch (err: unknown) {
    console.error("admin orders error:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
