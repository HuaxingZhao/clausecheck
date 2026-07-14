import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import { finalContractFilenames } from "@/lib/contract-export";
import {
  generateEditedContract,
  generateEditedContractFromOriginal,
} from "@/lib/final-contract";
import type { ContractChange } from "@/lib/types";

export const maxDuration = 90;

function parseChanges(raw: FormDataEntryValue | null): ContractChange[] {
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function originalTypeFromFile(file: File, originalFileName?: string | null): "pdf" | "docx" | null {
  const name = (originalFileName || file.name).toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const tier = await resolveTierForRequest(session?.sub ?? null);
    const isPro = tier === "pro" || tier === "pay_per_use";

    const contentType = req.headers.get("content-type") ?? "";
    let locale: "zh" | "en" = "zh";
    let contractText = "";
    let contractHtml = "";
    let format: "pdf" | "docx" = "pdf";
    let changes: ContractChange[] = [];
    let originalFile: File | null = null;
    let originalFileName: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      locale = form.get("locale") === "en" ? "en" : "zh";
      contractText = String(form.get("contractText") ?? "").trim();
      contractHtml = String(form.get("contractHtml") ?? "").trim();
      format = form.get("format") === "docx" ? "docx" : "pdf";
      changes = parseChanges(form.get("changes"));
      originalFileName = String(form.get("originalFileName") ?? "").trim() || null;
      const file = form.get("file");
      if (file instanceof File && file.size > 0) originalFile = file;
    } else {
      const body = await req.json();
      locale = body.locale === "en" ? "en" : "zh";
      contractText = String(body.contractText ?? "").trim();
      contractHtml = String(body.contractHtml ?? "").trim();
      format = body.format === "docx" ? "docx" : "pdf";
      changes = Array.isArray(body.changes) ? body.changes : [];

      const base64 = String(body.originalFileBase64 ?? "").trim();
      const originalFileType = body.originalFileType === "docx" ? "docx" : "pdf";
      if (base64) {
        const bytes = Buffer.from(base64, "base64");
        const ext = originalFileType === "docx" ? "docx" : "pdf";
        originalFile = new File([bytes], `original.${ext}`, {
          type:
            originalFileType === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "application/pdf",
        });
      }
    }

    if (!isPro) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Generating the final contract is a Pro feature."
              : "生成最终合同为专业版功能。",
          code: "PRO_REQUIRED",
        },
        { status: 403 }
      );
    }

    const names = finalContractFilenames(locale);

    if (originalFile) {
      const originalFileType = originalTypeFromFile(originalFile, originalFileName);
      if (!originalFileType) {
        return NextResponse.json(
          {
            error:
              locale === "en"
                ? "Only PDF or Word (.docx) originals can be exported with preserved layout."
                : "仅支持保留 PDF 或 Word (.docx) 原始版式导出。",
          },
          { status: 400 }
        );
      }

      const buf = new Uint8Array(await originalFile.arrayBuffer());
      const { bytes } = await generateEditedContractFromOriginal({
        originalBytes: buf,
        originalFileType,
        changes,
        format,
        locale,
      });

      if (format === "docx") {
        return new NextResponse(Buffer.from(bytes), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(names.docx)}"`,
          },
        });
      }

      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(names.pdf)}"`,
        },
      });
    }

    if (!contractText) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Contract text is required."
              : "缺少合同正文。",
        },
        { status: 400 }
      );
    }

    const { bytes } = await generateEditedContract({
      contractText,
      contractHtml: contractHtml || undefined,
      format,
      locale,
    });

    if (format === "docx") {
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(names.docx)}"`,
        },
      });
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(names.pdf)}"`,
      },
    });
  } catch (err: unknown) {
    console.error("revise/final error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
