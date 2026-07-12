import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import {
  generateDpaDraft,
  generateDpaDraftStub,
} from "@/lib/dpa/generate-dpa";
import { generateDpaDocx, dpaFilename } from "@/lib/dpa/export-dpa";

export const maxDuration = 90;

const bodySchema = z.object({
  jurisdiction: z.string().min(1).max(64),
  dataCategories: z.array(z.string().max(200)).max(30).default([]),
  processingPurpose: z.string().max(2000).default(""),
  controllerName: z.string().max(200).default(""),
  processorName: z.string().max(200).default(""),
  locale: z.enum(["zh", "en"]).optional(),
  /** When true and unlocked, return DOCX bytes instead of JSON. */
  download: z.enum(["docx"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await getSessionFromRequest(req);
    const tier = await resolveTierForRequest(session?.sub ?? null);
    const unlocked = tier === "pro" || tier === "pay_per_use";
    const locale = parsed.data.locale ?? "en";

    const input = {
      jurisdiction: parsed.data.jurisdiction,
      dataCategories: parsed.data.dataCategories,
      processingPurpose: parsed.data.processingPurpose,
      controllerName: parsed.data.controllerName,
      processorName: parsed.data.processorName,
      locale,
    };

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const result = apiKey
      ? await generateDpaDraft(input, { apiKey, unlocked })
      : generateDpaDraftStub(input, unlocked);

    if (parsed.data.download === "docx") {
      if (!unlocked || !result.fullContent) {
        return NextResponse.json(
          {
            error: "PRO_REQUIRED",
            message:
              locale === "zh"
                ? "完整 DPA 下载需 Pro 订阅"
                : "Full DPA download requires Pro",
          },
          { status: 403 }
        );
      }
      const buf = await generateDpaDocx(result.fullContent);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${dpaFilename("docx", locale)}"`,
        },
      });
    }

    return NextResponse.json({
      preview: result.preview,
      fullContent: result.fullContent,
      watermarkText: result.watermarkText,
      unlocked: result.unlocked,
      tier,
    });
  } catch (err: unknown) {
    console.error("generate-dpa error:", err);
    return NextResponse.json(
      {
        error: "DPA_GENERATION_FAILED",
        message: err instanceof Error ? err.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
