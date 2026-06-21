import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { analyzeContract, getDemoResult } from "@/lib/analyze";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const locale = (form.get("locale") as string) || "en";

    if (!file) {
      const msg =
        locale === "zh" ? "请上传文件" : "Please upload a file";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    // 提取文本
    const extracted = await extractTextFromBuffer(buffer, mimeType);
    if (!extracted.text || extracted.text.trim().length < 50) {
      const msg =
        locale === "zh"
          ? "未能从文件中提取到足够文本，请确认文件是文字型 PDF 或 DOCX"
          : "Could not extract enough text. Please make sure the file is a text-based PDF or DOCX";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // AI 分析 — 没有 Key 时返回 demo 结果
    const apiKey = process.env.OPENAI_API_KEY;
    const result = apiKey
      ? await analyzeContract(extracted.text, apiKey, locale)
      : getDemoResult(locale);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("scan error:", err);
    return NextResponse.json(
      { error: err.message || "Scan failed" },
      { status: 500 }
    );
  }
}
