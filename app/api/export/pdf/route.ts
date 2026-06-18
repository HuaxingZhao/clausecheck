import { NextRequest, NextResponse } from "next/server";

// PDF 导出已于 2025-06 迁移为 HTML 报告方案（/api/export/html）。
// HTML 报告内嵌 CSS、无字体依赖，浏览器 ⌘+P 即可另存 PDF。
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "PDF 导出已迁移为 HTML 报告",
      message: "请改用 POST /api/export/html，HTML 报告可在浏览器中 ⌘+P 另存为 PDF。",
      alternative: "/api/export/html",
    },
    { status: 410 }
  );
}
