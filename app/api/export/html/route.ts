import { NextRequest, NextResponse } from "next/server";
import { generateReportHtml } from "@/lib/html-export";
import type { ScanResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = body as ScanResult;

    if (!result || typeof result.scoreNum !== "number") {
      return NextResponse.json(
        { error: "无效的扫描结果数据" },
        { status: 400 }
      );
    }

    const html = generateReportHtml(result);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="ClauseCheck-Report.html"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("HTML export error:", err);
    return NextResponse.json(
      { error: err.message || "HTML 导出失败" },
      { status: 500 }
    );
  }
}
