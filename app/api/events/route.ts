import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/db/analytics-store";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      props?: Record<string, unknown>;
      path?: string;
      ts?: string;
    };

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    await recordAnalyticsEvent({
      name: body.name,
      props: body.props ?? {},
      path: typeof body.path === "string" ? body.path : null,
      ts: body.ts ?? new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("analytics event error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
