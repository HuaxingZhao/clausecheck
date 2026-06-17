import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { analyzeContract } from "@/lib/analyze";
import { getDemoResult } from "@/lib/demo";

const FREE_MAX_CHARS = 12000;
const PRO_MAX_CHARS = 80000;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // 读取用户 tier（由前端 localStorage 传入）
    const tier = (req.headers.get("x-user-tier") as string) || "free";

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    // 提取文本
    const extracted = await extractTextFromBuffer(buffer, mimeType);
    if (!extracted.text || extracted.text.trim().length < 50) {
      return NextResponse.json(
        { error: "未能从文件中提取到足够文本，请确认文件是文字型 PDF 或 DOCX" },
        { status: 400 }
      );
    }

    // 免费版：字数上限
    if (tier !== "pro" && tier !== "pay_per_use") {
      if (extracted.text.length > FREE_MAX_CHARS) {
        return NextResponse.json(
          {
            error: `免费版仅支持 ${FREE_MAX_CHARS.toLocaleString()} 字以内的合同。升级专业版支持 ${PRO_MAX_CHARS.toLocaleString()} 字。`,
            code: "TEXT_TOO_LONG",
          },
          { status: 413 }
        );
      }
    }

    // AI 分析 — 没有 Key 时返回 demo 结果
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(getDemoResult());
    }

    const deep = tier === "pro" || tier === "pay_per_use";
    const maxChars = deep ? PRO_MAX_CHARS : FREE_MAX_CHARS;
    const result = await analyzeContract(extracted.text, apiKey, { deep, maxChars });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("scan error:", err);
    return NextResponse.json(
      { error: err.message || "扫描失败" },
      { status: 500 }
    );
  }
}
