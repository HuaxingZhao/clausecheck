import type { ExtractedText } from "./types";

/**
 * 从 PDF / DOCX / TXT 中提取文本
 * 前端和 API 共用（前端仅做纯文本文件，复杂格式走服务端）
 */
export async function extractText(
  file: File
): Promise<ExtractedText> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const text = await file.text();
    return { text, sourceType: "txt" };
  }

  // PDF / DOCX 走服务端
  // 前端只返回 file 引用，服务端用 pdf-parse / mammoth
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/extract", { method: "POST", body: form });
  if (!res.ok) throw new Error("文本提取失败");

  return res.json();
}

/**
 * 服务端用：从 Buffer 提取文本
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedText> {
  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return { text: data.text, sourceType: "pdf", pageCount: data.numpages };
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, sourceType: "docx" };
  }

  // fallback：纯文本
  return { text: buffer.toString("utf-8"), sourceType: "unknown" };
}
