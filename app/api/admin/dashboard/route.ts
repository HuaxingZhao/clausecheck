import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  adminDbEnabled,
  fetchConversionTrend,
  fetchDashboardMetrics,
  fetchSignupTrend,
} from "@/lib/admin/queries";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!adminDbEnabled()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const [metrics, signups, conversion] = await Promise.all([
      fetchDashboardMetrics(),
      fetchSignupTrend(7),
      fetchConversionTrend(7),
    ]);

    return NextResponse.json({ metrics, signups, conversion });
  } catch (err: unknown) {
    console.error("admin dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
