import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/privacy/cron-auth";
import { runProRenewalReminders } from "@/lib/billing/pro-renewal-reminder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily: email prepaid Pro users whose access expires within 7 days
 * (7d + 1d windows, idempotent via audit_log).
 */
async function handle(req: NextRequest) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runProRenewalReminders({
      baseUrl: process.env.NEXT_PUBLIC_URL || "https://www.clausecheck.cc",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("pro-renewal-reminders failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder cron failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
