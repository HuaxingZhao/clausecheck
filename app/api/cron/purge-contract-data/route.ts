import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/privacy/cron-auth";
import { purgeExpiredContractData } from "@/lib/db/store";
import { CONTRACT_BODY_MAX_AGE_MS } from "@/lib/privacy/contract-retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hourly hard-delete of expired revision contract bodies + scrub of leftover
 * report sources. Vercel Cron: Authorization Bearer CRON_SECRET.
 */
async function handle(req: NextRequest) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await purgeExpiredContractData();
    return NextResponse.json({
      ok: true,
      maxAgeHours: CONTRACT_BODY_MAX_AGE_MS / (60 * 60 * 1000),
      ...result,
    });
  } catch (err) {
    console.error("purge-contract-data failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Purge failed" },
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
