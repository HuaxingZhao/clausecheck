"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { buildRedlinedDocument } from "@/lib/redline";
import {
  type ContractTemplateId,
  getContractTemplate,
  templateCssClass,
} from "@/lib/contract-templates";
import { toContractLines } from "@/lib/contract-format";
import type { ContractChange } from "@/lib/types";
import type { ReportLocale } from "@/lib/pdf-export";

interface ContractTemplatePreviewProps {
  contractText: string;
  appliedChanges: ContractChange[];
  templateId: ContractTemplateId;
  locale: ReportLocale;
}

function renderLineWithHighlights(text: string, changes: ContractChange[]) {
  const snippets = changes
    .map((c) => c.revised?.trim())
    .filter((s): s is string => !!s && text.includes(s));
  if (!snippets.length) return text;

  let parts: { text: string; highlight: boolean }[] = [{ text, highlight: false }];
  for (const snippet of snippets) {
    const next: { text: string; highlight: boolean }[] = [];
    for (const part of parts) {
      if (part.highlight || !part.text.includes(snippet)) {
        next.push(part);
        continue;
      }
      const segments = part.text.split(snippet);
      segments.forEach((seg, idx) => {
        if (seg) next.push({ text: seg, highlight: false });
        if (idx < segments.length - 1) next.push({ text: snippet, highlight: true });
      });
    }
    parts = next;
  }

  return parts.map((part, i) =>
    part.highlight ? (
      <mark key={i} className="doc-replaced">
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}

export default function ContractTemplatePreview({
  contractText,
  appliedChanges,
  templateId,
  locale,
}: ContractTemplatePreviewProps) {
  const t = useTranslations("revise");
  const tpl = getContractTemplate(templateId);

  const displayText = useMemo(() => {
    if (!contractText.trim()) return "";
    if (appliedChanges.length === 0) return contractText;
    return buildRedlinedDocument(contractText, appliedChanges).plainRevised;
  }, [contractText, appliedChanges]);

  const lines = useMemo(
    () => (displayText ? toContractLines(displayText) : []),
    [displayText]
  );

  return (
    <div className="doc-editor-scroll">
      <div className={`doc-editor-page ${templateCssClass(templateId)}`}>
        <div className="doc-editor-toolbar">
          <span className="text-xs font-sans text-ink-muted">
            {t("templatePreviewLabel")}: {tpl.label[locale]}
          </span>
          {appliedChanges.length > 0 && (
            <span className="doc-editor-applied-badge">
              {t("docEditorAppliedCount", { count: appliedChanges.length })}
            </span>
          )}
        </div>
        <div className="doc-editor-body">
          {lines.length === 0 ? (
            <p className="text-sm text-ink-muted font-sans">{t("noContractText")}</p>
          ) : (
            lines.map((line, pi) => {
              const Tag = line.kind === "title" ? "h1" : line.kind === "heading" ? "h2" : "p";
              return (
                <Tag key={pi} className={`doc-line doc-line--${line.kind}`}>
                  {renderLineWithHighlights(line.text, appliedChanges)}
                </Tag>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
