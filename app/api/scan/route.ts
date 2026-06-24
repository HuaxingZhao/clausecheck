import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { analyzeContract } from "@/lib/analyze";
import { getDemoResult } from "@/lib/demo";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import type { ExtractedText } from "@/lib/types";

export const maxDuration = 90;

const FREE_MAX_CHARS = 12000;
const PRO_MAX_CHARS = 80000;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // Resolve tier — prefer server session, then entitlements header sync
    const session = await getSessionFromRequest(req);
    const headerTier = req.headers.get("x-user-tier");
    let tier = await resolveTierForRequest(session?.sub ?? null, headerTier);

    // Also accept explicit tier from form (set after /api/entitlements check)
    const formTier = form.get("tier") as string | null;
    if (formTier === "pro" || formTier === "pay_per_use") {
      tier = formTier;
    }

    // 读取 locale（由前端 FormData 传入）
    const locale = (form.get("locale") as string) === "en" ? "en" : "zh";

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    // 提取文本
    let extracted: ExtractedText;
    try {
      extracted = await extractTextFromBuffer(buffer, mimeType);
    } catch (extractErr: any) {
      console.error("Text extraction failed:", extractErr);
      const msg =
        locale === "en"
          ? `Text extraction failed: ${extractErr.message || "Unknown error"}. If you uploaded a scanned (image-based) PDF, please convert it to a text-based PDF first.`
          : `文本提取失败：${extractErr.message || "未知错误"}。如果您上传的是扫描件（图片型 PDF），请先转为文字型 PDF 再上传。`;
      return NextResponse.json(
        { error: msg, code: "EXTRACTION_FAILED" },
        { status: 500 }
      );
    }
    if (!extracted.text || extracted.text.trim().length < 50) {
      const msg =
        locale === "en"
          ? "Not enough text extracted from the file. Please ensure it is a text-based PDF or DOCX."
          : "未能从文件中提取到足够文本，请确认文件是文字型 PDF 或 DOCX";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 免费版：字数上限
    if (tier !== "pro" && tier !== "pay_per_use") {
      if (extracted.text.length > FREE_MAX_CHARS) {
        const msg =
          locale === "en"
            ? `Free tier supports up to ${FREE_MAX_CHARS.toLocaleString()} characters. Upgrade to Pro for ${PRO_MAX_CHARS.toLocaleString()} characters.`
            : `免费版仅支持 ${FREE_MAX_CHARS.toLocaleString()} 字以内的合同。升级专业版支持 ${PRO_MAX_CHARS.toLocaleString()} 字。`;
        return NextResponse.json(
          { error: msg, code: "TEXT_TOO_LONG" },
          { status: 413 }
        );
      }
    }

    // AI 分析 — 没有 Key 时返回 demo 结果
    // ⚠️ 此行请勿改动：apiKey 从你本地 .env.local 的 OPENAI_API_KEY 读取
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return NextResponse.json(getDemoResult(locale));
    }

    const deep = tier === "pro" || tier === "pay_per_use";
    const maxChars = deep ? PRO_MAX_CHARS : FREE_MAX_CHARS;
    const result = await analyzeContract(extracted.text, apiKey, {
      deep,
      maxChars,
      locale,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("scan error:", err);
    return NextResponse.json(
      { error: err.message || "扫描失败" },
      { status: 500 }
    );
  }
}
