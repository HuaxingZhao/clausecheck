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

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ClauseCheck-Report.pdf"; filename*=UTF-8''ClauseCheck-%E5%90%88%E5%90%8C%E9%A3%8E%E9%99%A9%E6%8A%A5%E5%91%8A.pdf`,
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
