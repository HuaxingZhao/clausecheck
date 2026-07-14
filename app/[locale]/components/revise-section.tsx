"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ScanResult, ReviseResult, ContractChange, SkippedChangeSummary } from "@/lib/types";
import ContractReviseEditor from "./contract-revise-editor";
import { Link } from "@/i18n/routing";

interface ReviseSectionProps {
  result: ScanResult;
  contractText: string | null;
  originalFile: File | null;
  isPro: boolean;
  locale: string;
  onUpgradePro?: () => void;
  onPayPerUse?: () => void;
  placement?: "top" | "inline";
}

function originalFileType(file: File): "pdf" | "docx" | null {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  return null;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export default function ReviseSection({
  result,
  contractText,
  originalFile,
  isPro,
  locale,
  onUpgradePro,
  onPayPerUse,
  placement = "top",
}: ReviseSectionProps) {
  const t = useTranslations("revise");

  const flagIndices = useMemo(
    () => result.flags.map((f, i) => (f.suggestion ? i : -1)).filter((i) => i >= 0),
    [result.flags]
  );

  const negoIndices = useMemo(
    () => (result.negotiations || []).map((_, i) => i),
    [result.negotiations]
  );

  const missingIndices = useMemo(
    () => (result.missingClauses || []).map((_, i) => i),
    [result.missingClauses]
  );

  const totalSuggestions = flagIndices.length + negoIndices.length + missingIndices.length;

  const [loadingEditor, setLoadingEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewGate, setShowPreviewGate] = useState(false);
  const [includedChanges, setIncludedChanges] = useState<Set<number>>(new Set());
  const [editedChanges, setEditedChanges] = useState<ContractChange[]>([]);
  const [editedContractBody, setEditedContractBody] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [changesLoaded, setChangesLoaded] = useState(false);
  const [skippedLoaded, setSkippedLoaded] = useState<SkippedChangeSummary[]>([]);

  const canEditInPlace = originalFile && originalFileType(originalFile) !== null;
  const hasSuggestions = totalSuggestions > 0;

  const handleEditorSave = useCallback(
    (changes: ContractChange[], included: Set<number>, contractBody: string) => {
      setEditedChanges(changes);
      setIncludedChanges(included);
      setEditedContractBody(contractBody);
      setLastSavedAt(Date.now());
    },
    []
  );

  if (!hasSuggestions) return null;

  async function handleOpenEditor() {
    if (!contractText) {
      setError(t("noContractText"));
      return;
    }
    if (!isPro) {
      setShowPreviewGate(true);
      return;
    }

    if (changesLoaded && editedChanges.length > 0) {
      setEditorOpen(true);
      return;
    }

    setLoadingEditor(true);
    setError(null);

    try {
      let originalFileBase64: string | undefined;
      let originalFileTypeValue: "pdf" | "docx" | undefined;
      if (originalFile && canEditInPlace) {
        originalFileBase64 = await fileToBase64(originalFile);
        originalFileTypeValue = originalFileType(originalFile) ?? undefined;
      }

      const res = await fetch("/api/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-tier": isPro ? "pro" : "free",
        },
        body: JSON.stringify({
          contractText,
          result,
          locale,
          acceptedFlags: flagIndices,
          acceptedNegotiations: negoIndices,
          acceptedMissingClauses: missingIndices,
          originalFileBase64,
          originalFileType: originalFileTypeValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("failed"));
      }
      const rr = data as ReviseResult;
      setEditedChanges(rr.changes.map((c) => ({ ...c })));
      setSkippedLoaded(rr.skippedChanges ?? []);
      setIncludedChanges(new Set());
      setChangesLoaded(true);
      setEditorOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("failed");
      setError(message);
    } finally {
      setLoadingEditor(false);
    }
  }

  const topBar = (
    <div className="revise-editor-top-bar mb-6">
      <div className="revise-editor-top-bar-inner">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-sans font-semibold uppercase tracking-wide text-ink-muted mb-1">
            {t("stepLabel")}
          </p>
          <p className="font-sans font-semibold text-ink mb-0.5">
            {t("editorStepTitle", { count: totalSuggestions })}
          </p>
          <p className="text-sm text-ink-light font-sans leading-relaxed">
            {lastSavedAt ? t("editorReadySaved") : t("editorStepHint")}
          </p>
          {lastSavedAt && (
            <Link href="/revisions" className="link-accent text-sm mt-1 inline-block">
              {t("historySuggestions")}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenEditor}
          disabled={loadingEditor || !contractText}
          className={`btn btn-primary shrink-0 btn-lg ${loadingEditor ? "opacity-60 cursor-wait" : ""}`}
        >
          {loadingEditor ? t("editorLoading") : changesLoaded ? t("openEditorAgain") : t("openEditor")}
        </button>
      </div>

      {!contractText && (
        <p className="text-sm text-amber-700 bg-amber-50/80 rounded-lg p-3 mt-3 font-sans">
          {t("noContractText")}
        </p>
      )}

      {!originalFile && contractText && (
        <p className="text-sm text-amber-700 bg-amber-50/80 rounded-lg p-3 mt-3 font-sans">
          {t("originalPreviewUnsupported")}
        </p>
      )}

      {showPreviewGate && !isPro && (
        <div className="upgrade-banner mt-3">
          <div className="upgrade-banner-inner">
            <div>
              <p className="font-sans font-semibold text-ink mb-1">{t("proGateTitle")}</p>
              <p className="text-sm text-ink-light leading-relaxed">{t("proGateBody")}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {onUpgradePro && (
                <button type="button" onClick={onUpgradePro} className="btn btn-primary">
                  {t("proGateCta")}
                </button>
              )}
              {onPayPerUse && (
                <button type="button" onClick={onPayPerUse} className="btn btn-outline text-sm">
                  {t("proGateOnce")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mt-3 text-center font-sans">{error}</p>
      )}
    </div>
  );

  return (
    <>
      {placement === "top" ? topBar : null}

      <ContractReviseEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        originalFile={originalFile}
        contractText={contractText}
        initialContractBody={editedContractBody}
        initialChanges={editedChanges}
        initialIncluded={includedChanges}
        initialSaved={lastSavedAt !== null}
        skippedChanges={skippedLoaded}
        locale={locale}
        isPro={isPro}
        onSave={handleEditorSave}
      />

      {placement === "inline" ? (
        <div className="summary-card mb-6 mt-8 border-l-4 border-accent">
          <h4 className="mb-2">{t("title")}</h4>
          <p className="text-sm text-ink-light mb-5 leading-relaxed">{t("subtitle")}</p>
          {topBar}
        </div>
      ) : null}
    </>
  );
}
