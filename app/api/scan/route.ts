import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { analyzeContractFirstPass, pipelineRefineNeeded } from "@/lib/analyze";
import { DEFAULT_SCENARIO_ID, isValidScenarioId } from "@/lib/contract-scenarios";
import { getDemoResult } from "@/lib/demo";
import { checkScanAccess, recordScanUsage } from "@/lib/server-quota";
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

    const locale = (form.get("locale") as string) === "en" ? "en" : "zh";
    const access = await checkScanAccess(req, locale);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: 403 }
      );
    }
    const tier = access.tier;

    const rawScenario = String(form.get("scenario") ?? DEFAULT_SCENARIO_ID);
    const scenarioId = isValidScenarioId(rawScenario) ? rawScenario : DEFAULT_SCENARIO_ID;

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    let extracted: ExtractedText;
    try {
      extracted = await extractTextFromBuffer(buffer, mimeType);
    } catch (extractErr: unknown) {
      console.error("Text extraction failed:", extractErr);
      const message = extractErr instanceof Error ? extractErr.message : "Unknown error";
      const msg =
        locale === "en"
          ? `Text extraction failed: ${message}. If you uploaded a scanned (image-based) PDF, please convert it to a text-based PDF first.`
          : `文本提取失败：${message}。如果您上传的是扫描件（图片型 PDF），请先转为文字型 PDF 再上传。`;
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

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return NextResponse.json(getDemoResult(locale));
    }

    const deep = tier === "pro" || tier === "pay_per_use";
    const maxChars = deep ? PRO_MAX_CHARS : FREE_MAX_CHARS;
    const result = await analyzeContractFirstPass(extracted.text, apiKey, {
      deep,
      maxChars,
      locale,
      scenarioId,
    });

    await recordScanUsage(req, access);

    const contractText = extracted.text.slice(0, maxChars);
    const refineNeeded = pipelineRefineNeeded(result, {
      deep,
      locale,
      scenarioId: result.scenarioId ?? scenarioId,
    });

    return NextResponse.json({
      ...result,
      contractText,
      refineNeeded,
      tier,
    });
  } catch (err: unknown) {
    console.error("scan error:", err);
    const message = err instanceof Error ? err.message : "扫描失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
