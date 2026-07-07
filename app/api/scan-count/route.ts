import { NextResponse } from "next/server";
import { getGlobalScanCount, incrementGlobalScanCount } from "@/lib/db/scan-metrics";

export async function GET() {
  try {
    const count = await getGlobalScanCount();
    return NextResponse.json({ count });
  } catch (err: unknown) {
    console.error("scan-count GET error:", err);
    return NextResponse.json({ count: 331 });
  }
}

export async function POST() {
  try {
    const count = await incrementGlobalScanCount();
    return NextResponse.json({ count });
  } catch (err: unknown) {
    console.error("scan-count POST error:", err);
    return NextResponse.json({ error: "Failed to increment scan count" }, { status: 500 });
  }
}
