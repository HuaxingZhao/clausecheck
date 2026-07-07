import { NextRequest, NextResponse } from "next/server";
import { getQuotaStatus } from "@/lib/server-quota";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const status = await getQuotaStatus(req);
    return NextResponse.json(status);
  } catch (err: unknown) {
    console.error("quota status error:", err);
    const message = err instanceof Error ? err.message : "Failed to load quota";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
