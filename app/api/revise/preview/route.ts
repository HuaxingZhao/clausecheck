import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import { highlightChangesOnPdf, applyChangesToPdf, previewChangesOnPdf } from "@/lib/pdf-edit";
import type { ContractChange } from "@/lib/types";

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const tier = await resolveTierForRequest(session?.sub ?? null);
    const isPro = tier === "pro" || tier === "pay_per_use";
    const form = await req.formData();
    const locale = form.get("locale") === "en" ? "en" : "zh";
    const file = form.get("file");
    const rawChanges = form.get("changes");
    const mode = String(form.get("mode") ?? "highlight");

    if (!isPro) {
      return NextResponse.json({ error: "Pro required" }, { status: 403 });
    }

    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF required for preview" }, { status: 400 });
    }

    let changes: ContractChange[] = [];
    try {
      changes = JSON.parse(String(rawChanges ?? "[]"));
    } catch {
      return NextResponse.json({ error: "Invalid changes" }, { status: 400 });
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    let bytes: Uint8Array;
    if (mode === "apply") {
      ({ bytes } = await applyChangesToPdf(buf, changes, locale));
    } else if (mode === "preview") {
      ({ bytes } = await previewChangesOnPdf(buf, changes, locale));
    } else {
      ({ bytes } = await highlightChangesOnPdf(buf, changes, locale));
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: unknown) {
    console.error("revise/preview error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
