import { applyChangesToDocx } from "@/lib/docx-edit";
import { generateContractDocxFromHtml } from "@/lib/html-contract-docx";
import { htmlToPlainText, isRichTextHtml } from "@/lib/rich-text";
import { buildRedlinedDocument } from "@/lib/redline";
import type { ContractTemplateId } from "@/lib/contract-templates";
import {
  generateCleanContractPdf,
  generateFinalContractDocx,
} from "@/lib/contract-export";
import { applyChangesToPdf } from "@/lib/pdf-edit";
import type { ReportLocale } from "@/lib/pdf-export";
import type { ContractChange } from "@/lib/types";
import { defaultTemplateForLocale, isProfessionalTemplate } from "@/lib/contract-templates";

export type FinalContractFormat = "pdf" | "docx";

function plainRevised(contractText: string, changes: ContractChange[]): string {
  if (!contractText.trim()) return "";
  const doc = buildRedlinedDocument(contractText, changes);
  return doc.plainRevised || contractText;
}

/**
 * Rebuild the final contract from extracted text + applied suggestions,
 * using the user-selected professional template (Word or PDF).
 */
export async function generateFinalContract(
  opts: {
    format: FinalContractFormat;
    changes: ContractChange[];
    contractText: string;
    locale: ReportLocale;
    templateId?: ContractTemplateId | string;
  }
): Promise<{ bytes: Uint8Array }> {
  const { format, changes, contractText, locale } = opts;
  const rawTemplate = opts.templateId ?? "";
  const templateId: ContractTemplateId = isProfessionalTemplate(rawTemplate)
    ? rawTemplate
    : defaultTemplateForLocale(locale);

  const text = plainRevised(contractText, changes) || contractText;

  if (format === "docx") {
    const bytes = await generateFinalContractDocx(text, locale, templateId);
    return { bytes };
  }

  const bytes = await generateCleanContractPdf(text, locale, templateId);
  return { bytes };
}

/** Export user-edited contract body as a formatted Word or PDF document. */
export async function generateEditedContract(opts: {
  contractText: string;
  contractHtml?: string;
  format: FinalContractFormat;
  locale: ReportLocale;
  templateId?: ContractTemplateId | string;
}): Promise<{ bytes: Uint8Array }> {
  const { format, locale } = opts;
  const rawTemplate = opts.templateId ?? "";
  const templateId: ContractTemplateId = isProfessionalTemplate(rawTemplate)
    ? rawTemplate
    : defaultTemplateForLocale(locale);

  const html = opts.contractHtml?.trim();
  const plain = htmlToPlainText(opts.contractText || html || "");

  if (format === "docx") {
    if (html && isRichTextHtml(html)) {
      const bytes = await generateContractDocxFromHtml(html, locale, templateId);
      return { bytes };
    }
    const bytes = await generateFinalContractDocx(plain, locale, templateId);
    return { bytes };
  }

  const bytes = await generateCleanContractPdf(plain, locale, templateId);
  return { bytes };
}

/** Patch accepted changes into the user's uploaded file, preserving original layout. */
export async function generateEditedContractFromOriginal(opts: {
  originalBytes: Uint8Array;
  originalFileType: "pdf" | "docx";
  changes: ContractChange[];
  format: FinalContractFormat;
  locale: ReportLocale;
}): Promise<{ bytes: Uint8Array; applied: number }> {
  const { originalBytes, originalFileType, changes, format, locale } = opts;

  if (originalFileType === "pdf") {
    if (format !== "pdf") {
      throw new Error(
        locale === "en"
          ? "Download Word is not available for PDF uploads. Download PDF to keep your original layout."
          : "PDF 上传的合同无法导出 Word，请下载 PDF 以保留原始版式。"
      );
    }
    return applyChangesToPdf(originalBytes, changes, locale);
  }

  if (format !== "docx") {
    throw new Error(
      locale === "en"
        ? "Download PDF is not available for Word uploads. Download Word to keep your original layout."
        : "Word 上传的合同无法导出 PDF，请下载 Word 以保留原始版式。"
    );
  }
  return applyChangesToDocx(originalBytes, changes);
}
