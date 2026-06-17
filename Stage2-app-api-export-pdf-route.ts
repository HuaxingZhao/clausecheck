import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/pdf-export";
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

    const pdfBytes = await generateReportPdf(result);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ClauseCheck-合同风险报告.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("PDF export error:", err);
    return NextResponse.json(
      { error: err.message || "PDF 导出失败" },
      { status: 500 }
    );
  }
}
