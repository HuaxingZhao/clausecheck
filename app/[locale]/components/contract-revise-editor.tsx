"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { ContractChange } from "@/lib/types";
import {
  contractBodyForExport,
  contractBodyPlainText,
  prepareEditableContractHtml,
} from "@/lib/rich-text";
import { layoutFormatPlainText } from "@/lib/contract-professional-format";
import ContractEditableDocument, {
  type ContractEditorHandle,
} from "./contract-editable-document";
import ContractSavedPreview from "./contract-saved-preview";
import OriginalContractPreview from "./original-contract-preview";
import SuggestionDiffDisplay from "./suggestion-diff-display";
import type { SkippedChangeSummary } from "@/lib/types";

interface ContractReviseEditorProps {
  open: boolean;
  onClose: () => void;
  originalFile: File | null;
  contractText: string | null;
  initialContractBody?: string | null;
  initialChanges: ContractChange[];
  initialIncluded: Set<number>;
  initialSaved?: boolean;
  skippedChanges?: SkippedChangeSummary[];
  locale: string;
  isPro: boolean;
  onSave: (changes: ContractChange[], included: Set<number>, contractBody: string) => void;
}

function toggleSet(set: Set<number>, index: number, checked: boolean) {
  const next = new Set(set);
  if (checked) next.add(index);
  else next.delete(index);
  return next;
}

function originalUploadType(file: File | null): "pdf" | "docx" | null {
  if (!file) return null;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  return null;
}

function acceptedChanges(changes: ContractChange[], included: Set<number>): ContractChange[] {
  return changes.filter((_, index) => included.has(index));
}

export default function ContractReviseEditor({
  open,
  onClose,
  originalFile,
  contractText,
  initialContractBody,
  initialChanges,
  initialIncluded,
  initialSaved = false,
  skippedChanges = [],
  locale,
  isPro,
  onSave,
}: ContractReviseEditorProps) {
  const t = useTranslations("revise");

  const [draftChanges, setDraftChanges] = useState<ContractChange[]>([]);
  const [draftIncluded, setDraftIncluded] = useState<Set<number>>(new Set());
  const [editedBody, setEditedBody] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [savedIncluded, setSavedIncluded] = useState<Set<number>>(new Set());
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [leftPaneMode, setLeftPaneMode] = useState<"edit" | "preview">("edit");
  const [docxLoading, setDocxLoading] = useState(false);
  const [applyFlashIndex, setApplyFlashIndex] = useState<number | null>(null);
  const [applyErrorIndex, setApplyErrorIndex] = useState<number | null>(null);
  const [acceptAllNotice, setAcceptAllNotice] = useState<string | null>(null);
  const [locatedFlags, setLocatedFlags] = useState<boolean[]>([]);
  const [navigableFlags, setNavigableFlags] = useState<boolean[]>([]);
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<ContractEditorHandle>(null);
  const suggestionsListRef = useRef<HTMLDivElement>(null);

  const originalType = originalUploadType(originalFile);
  const isPdfOriginal = originalType === "pdf";
  const isDocxOriginal = originalType === "docx";
  const usesOriginalLayout = isPdfOriginal || isDocxOriginal;

  const baseHtml = useMemo(
    () => prepareEditableContractHtml(initialContractBody || contractText || ""),
    [initialContractBody, contractText]
  );

  useEffect(() => {
    if (!open) return;
    setDraftIncluded(new Set(initialIncluded));
    setSavedIncluded(new Set(initialIncluded));
    setSaveFlash(false);
    setDownloadError(null);
    setFocusedIndex(null);
    setApplyFlashIndex(null);
    setApplyErrorIndex(null);
    setLocatedFlags([]);
    setLeftPaneMode(initialSaved ? "preview" : "edit");

    let cancelled = false;

    function applyBodyAndChanges(body: string) {
      if (cancelled) return;
      setDraftChanges(initialChanges.map((c) => ({ ...c })));
      setEditedBody(body);
      setSavedBody(initialSaved ? body : "");
      setHasSavedOnce(initialSaved);
    }

    async function initBody() {
      if (initialContractBody) {
        applyBodyAndChanges(prepareEditableContractHtml(initialContractBody));
        return;
      }

      if (isDocxOriginal && originalFile) {
        setDocxLoading(true);
        try {
          const mammoth = await import("mammoth");
          const buf = await originalFile.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          const html =
            result.value?.trim() || prepareEditableContractHtml(contractText || "");
          applyBodyAndChanges(html);
        } catch {
          applyBodyAndChanges(baseHtml);
        } finally {
          if (!cancelled) setDocxLoading(false);
        }
        return;
      }

      const loc = locale === "en" ? "en" : "zh";
      applyBodyAndChanges(layoutFormatPlainText(contractText || "", loc).html);
    }

    void initBody();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    initialChanges,
    initialIncluded,
    initialSaved,
    contractText,
    baseHtml,
    initialContractBody,
    isDocxOriginal,
    originalFile,
    locale,
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const focusSuggestion = useCallback(
    (index: number) => {
      if (leftPaneMode === "preview") setLeftPaneMode("edit");
      setFocusedIndex(index);
      setApplyErrorIndex(null);
      window.requestAnimationFrame(() => {
        suggestionsListRef.current
          ?.querySelector(`#suggestion-card-${index}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [leftPaneMode]
  );

  const handleChangesRefined = useCallback((refined: ContractChange[]) => {
    setDraftChanges(refined);
  }, []);

  useEffect(() => {
    if (editedBody !== savedBody) setLeftPaneMode("edit");
  }, [editedBody, savedBody]);

  const savedAcceptedChanges = useMemo(
    () => acceptedChanges(draftChanges, savedIncluded),
    [draftChanges, savedIncluded]
  );

  const locationFlagsReady =
    navigableFlags.length === draftChanges.length && draftChanges.length > 0;

  const visibleSuggestionIndices = useMemo(() => {
    if (!locationFlagsReady) {
      return draftChanges.map((_, i) => i);
    }
    return draftChanges
      .map((_, i) => i)
      .filter((i) => navigableFlags[i] !== false);
  }, [draftChanges, navigableFlags, locationFlagsReady]);

  const hiddenSuggestionCount = locationFlagsReady
    ? draftChanges.length - visibleSuggestionIndices.length
    : 0;

  const isDirty = useMemo(() => {
    if (editedBody !== savedBody) return true;
    if (draftIncluded.size !== savedIncluded.size) return true;
    for (const i of draftIncluded) {
      if (!savedIncluded.has(i)) return true;
    }
    for (const i of savedIncluded) {
      if (!draftIncluded.has(i)) return true;
    }
    return false;
  }, [editedBody, savedBody, draftIncluded, savedIncluded]);

  const handleSave = useCallback(() => {
    const body = editorRef.current?.getHtml() ?? editedBody;
    setEditedBody(body);
    setSavedBody(body);
    setSavedIncluded(new Set(draftIncluded));
    setHasSavedOnce(true);
    setSaveFlash(true);
    setLeftPaneMode("preview");
    onSave(draftChanges, draftIncluded, body);
    window.setTimeout(() => setSaveFlash(false), 2500);
  }, [draftChanges, draftIncluded, editedBody, onSave]);

  function acceptSuggestion(index: number) {
    const change = draftChanges[index];
    if (!change) return;
    const ok = editorRef.current?.applyChange(change, index);
    if (ok) {
      setEditedBody(editorRef.current?.getHtml() ?? editedBody);
      setDraftIncluded(toggleSet(draftIncluded, index, true));
      setApplyFlashIndex(index);
      setApplyErrorIndex(null);
      window.setTimeout(() => setApplyFlashIndex(null), 1200);
    } else {
      setApplyErrorIndex(index);
      window.setTimeout(() => setApplyErrorIndex(null), 3000);
    }
    focusSuggestion(index);
  }

  function rejectSuggestion(index: number) {
    const change = draftChanges[index];
    if (draftIncluded.has(index) && change?.original && change?.revised) {
      const ok = editorRef.current?.applyChange(
        { ...change, original: change.revised, revised: change.original },
        index
      );
      if (ok) setEditedBody(editorRef.current?.getHtml() ?? editedBody);
    }
    setDraftIncluded(toggleSet(draftIncluded, index, false));
    setApplyErrorIndex(null);
    focusSuggestion(index);
  }

  function rejectAllSuggestions() {
    const toRevert = [...draftIncluded];
    for (const index of toRevert) {
      const change = draftChanges[index];
      if (!change?.original || !change?.revised) continue;
      editorRef.current?.applyChange(
        { ...change, original: change.revised, revised: change.original },
        index
      );
    }
    setEditedBody(editorRef.current?.getHtml() ?? editedBody);
    setDraftIncluded(new Set());
  }

  async function handleDownloadContract(format: "pdf" | "docx") {
    if (!hasSavedOnce || isDirty) return;

    if (usesOriginalLayout && originalType && format !== originalType) {
      setDownloadError(t("downloadFormatMismatch"));
      return;
    }

    setDownloading(format);
    setDownloadError(null);
    try {
      let res: Response;

      if (usesOriginalLayout && originalFile) {
        const fd = new FormData();
        fd.append("file", originalFile);
        fd.append("changes", JSON.stringify(savedAcceptedChanges));
        fd.append("format", format);
        fd.append("locale", locale);
        res = await fetch("/api/revise/final", {
          method: "POST",
          headers: { "x-user-tier": isPro ? "pro" : "free" },
          body: fd,
        });
      } else {
        res = await fetch("/api/revise/final", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-tier": isPro ? "pro" : "free",
          },
          body: JSON.stringify({
            format,
            locale,
            contractText: contractBodyForExport(savedBody),
            contractHtml: savedBody,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("contractDownloadFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const zh = locale === "zh";
      a.download =
        format === "pdf"
          ? zh
            ? "ClauseCheck-编辑版合同.pdf"
            : "ClauseCheck-Edited-Contract.pdf"
          : zh
            ? "ClauseCheck-编辑版合同.docx"
            : "ClauseCheck-Edited-Contract.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : t("contractDownloadFailed"));
    } finally {
      setDownloading(null);
    }
  }

  function handleClose() {
    if (isDirty && !window.confirm(t("editorCloseConfirm"))) return;
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (isDirty && !window.confirm(t("editorCloseConfirm"))) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isDirty, onClose, t]);

  if (!open || !mounted) return null;

  const canSave = !!contractBodyPlainText(editedBody).trim();
  const downloadDisabled =
    !hasSavedOnce || isDirty || !contractBodyPlainText(editedBody).trim();
  const previewAvailable = hasSavedOnce && !isDirty && !!savedBody.trim();
  const editorSubtitle = usesOriginalLayout
    ? t("editorSubtitleWordLike")
    : t("editorSubtitleEditable");
  const docxDownloadDisabled = downloadDisabled || originalType === "pdf";
  const pdfDownloadDisabled = downloadDisabled || originalType === "docx";

  return createPortal(
    <div className="revise-editor-overlay revise-editor-overlay--fullscreen">
      <div className="revise-editor-window revise-editor-window--fullscreen">
        <header className="revise-editor-header revise-editor-header--pro">
          <div className="min-w-0 flex items-start gap-3">
            <div className="revise-editor-app-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="revise-editor-title">{t("editorTitle")}</h2>
              <p className="revise-editor-subtitle text-sm text-ink-light font-sans">
                {editorSubtitle}
              </p>
            </div>
          </div>
          <div className="revise-editor-header-actions">
            {isDirty && (
              <span className="revise-editor-unsaved">{t("editorUnsaved")}</span>
            )}
            {saveFlash && (
              <span className="revise-editor-saved-flash">{t("editorSaved")}</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`btn btn-primary shrink-0 ${!canSave ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t("editorSave")}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadContract("docx")}
              disabled={!!downloading || docxDownloadDisabled}
              className={`btn btn-outline shrink-0 ${docxDownloadDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={
                originalType === "pdf"
                  ? t("downloadDocxUnavailablePdf")
                  : downloadDisabled
                    ? t("editorDownloadHint")
                    : t("downloadEditedDocx")
              }
            >
              {downloading === "docx" ? t("downloading") : t("downloadEditedDocx")}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadContract("pdf")}
              disabled={!!downloading || pdfDownloadDisabled}
              className={`btn btn-outline shrink-0 ${pdfDownloadDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={
                originalType === "docx"
                  ? t("downloadPdfUnavailableDocx")
                  : downloadDisabled
                    ? t("editorDownloadHint")
                    : t("downloadEditedPdf")
              }
            >
              {downloading === "pdf" ? t("downloading") : t("downloadEditedPdf")}
            </button>
            <button
              type="button"
              className="revise-editor-close"
              onClick={handleClose}
              aria-label={t("editorClose")}
            >
              ×
            </button>
          </div>
        </header>

        <div className="revise-editor-body revise-editor-body--pro">
          <section className="revise-editor-preview-pane revise-editor-preview-pane--pro">
            <div className="revise-editor-pane-label revise-editor-pane-label--pro flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>{t("editorContractBodyLabel")}</span>
                <div className="revise-editor-pane-tabs">
                  <button
                    type="button"
                    className={`revise-editor-pane-tab ${leftPaneMode === "edit" ? "revise-editor-pane-tab--active" : ""}`}
                    onClick={() => setLeftPaneMode("edit")}
                  >
                    {t("editorEditTab")}
                  </button>
                  <button
                    type="button"
                    className={`revise-editor-pane-tab ${leftPaneMode === "preview" ? "revise-editor-pane-tab--active" : ""}`}
                    disabled={!previewAvailable}
                    title={!previewAvailable ? t("editorPreviewSaveFirst") : t("editorPreviewTab")}
                    onClick={() => previewAvailable && setLeftPaneMode("preview")}
                  >
                    {t("editorPreviewTab")}
                  </button>
                </div>
              </div>
              {leftPaneMode === "preview" && (
                <span className="text-xs font-normal normal-case tracking-normal text-green-700">
                  {t("editorPreviewSavedHint")}
                </span>
              )}
            </div>

            {leftPaneMode === "preview" && previewAvailable ? (
              usesOriginalLayout && originalFile ? (
                <OriginalContractPreview
                  file={originalFile}
                  changes={savedAcceptedChanges}
                  locale={locale}
                  isPro={isPro}
                  embedded
                  previewMode="apply"
                />
              ) : (
                <ContractSavedPreview html={savedBody || editedBody} locale={locale} />
              )
            ) : docxLoading ? (
              <div className="doc-editor-scroll flex items-center justify-center p-8">
                <p className="text-sm text-ink-muted font-sans">{t("previewLoading")}</p>
              </div>
            ) : contractText || editedBody ? (
              <ContractEditableDocument
                ref={editorRef}
                value={editedBody}
                onChange={setEditedBody}
                changes={draftChanges}
                focusedIndex={focusedIndex}
                appliedIndices={draftIncluded}
                onLocatedChange={setLocatedFlags}
                onNavigableChange={setNavigableFlags}
                onChangesRefined={handleChangesRefined}
                locale={locale}
              />
            ) : (
              <div className="doc-editor-scroll flex items-center justify-center p-8">
                <p className="text-sm text-ink-muted font-sans">{t("noContractText")}</p>
              </div>
            )}
          </section>

          <section className="revise-editor-edit-pane revise-editor-edit-pane--pro">
            <div className="revise-editor-pane-label revise-editor-pane-label--pro flex flex-wrap items-center justify-between gap-2">
              <span>{t("editorSuggestionsLabel")}</span>
              <div className="flex items-center gap-3 text-xs font-normal normal-case tracking-normal">
                <span className="text-ink-muted">
                  {t("acceptedCount", {
                    count: draftIncluded.size,
                    total: visibleSuggestionIndices.length,
                  })}
                </span>
                <button
                  type="button"
                  className="link-accent"
                  onClick={() => {
                    const applied =
                      editorRef.current?.applyAllChanges(draftChanges) ?? new Set<number>();
                    setEditedBody(editorRef.current?.getHtml() ?? editedBody);
                    setDraftIncluded(applied);
                    if (applied.size < draftChanges.length) {
                      setAcceptAllNotice(
                        t("acceptAllPartial", {
                          applied: applied.size,
                          total: draftChanges.length,
                        })
                      );
                      window.setTimeout(() => setAcceptAllNotice(null), 4000);
                    } else {
                      setAcceptAllNotice(null);
                    }
                  }}
                >
                  {t("acceptAllChanges")}
                </button>
                <button
                  type="button"
                  className="link-accent"
                  onClick={() => rejectAllSuggestions()}
                >
                  {t("rejectAllChanges")}
                </button>
              </div>
            </div>

            <p className="revise-editor-suggestions-hint text-xs text-ink-muted px-3 py-2 font-sans leading-snug">
              {isPdfOriginal ? t("editorAcceptApplyHintPdf") : t("editorAcceptApplyHint")}
            </p>

            {acceptAllNotice && (
              <p className="text-xs text-amber-800 bg-amber-50/90 px-3 py-2 font-sans border-b border-amber-200/60 leading-snug">
                {acceptAllNotice}
              </p>
            )}

            {hiddenSuggestionCount > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50/90 px-3 py-2 font-sans border-b border-amber-200/60 leading-snug">
                {t("skippedSuggestionsNotice", { count: hiddenSuggestionCount })}
              </p>
            )}

            {skippedChanges.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50/90 px-3 py-2 font-sans border-b border-amber-200/60 leading-snug">
                {t("skippedSuggestionsNotice", { count: skippedChanges.length })}
              </p>
            )}

            <div className="revise-editor-changes-list" ref={suggestionsListRef}>
              {visibleSuggestionIndices.map((i) => {
                const change = draftChanges[i]!;
                const accepted = draftIncluded.has(i);
                const appliedFlash = applyFlashIndex === i;
                const applyFailed = applyErrorIndex === i;
                const canApply = locatedFlags[i] === true;
                const notLocated = !canApply && !accepted;
                return (
                  <div
                    key={i}
                    id={`suggestion-card-${i}`}
                    className={`suggestion-pick-card ${accepted ? "suggestion-pick-card--active" : ""} ${focusedIndex === i ? "suggestion-pick-card--focused" : ""} ${appliedFlash ? "suggestion-pick-card--applied-flash" : ""} ${applyFailed ? "suggestion-pick-card--error" : ""}`}
                  >
                    <button
                      type="button"
                      className="suggestion-pick-header w-full"
                      onClick={() => focusSuggestion(i)}
                    >
                      <span className={`suggestion-pick-number ${focusedIndex === i ? "suggestion-pick-number--focused" : ""}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2 text-left">
                        {change.section && (
                          <span className="block text-xs font-sans font-semibold text-ink-muted">
                            {change.section}
                          </span>
                        )}
                        <SuggestionDiffDisplay
                          original={change.original ?? ""}
                          revised={change.revised ?? ""}
                        />
                        {change.reason && (
                          <p className="text-xs text-ink-muted font-sans leading-relaxed">
                            {change.reason}
                          </p>
                        )}
                        {notLocated && !accepted && (
                          <p className="text-xs text-amber-700 font-sans leading-relaxed">
                            {t("suggestionNotLocated")}
                          </p>
                        )}
                        {applyFailed && (
                          <p className="text-xs text-red-600 font-sans leading-relaxed">
                            {t("acceptApplyFailed")}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="suggestion-pick-actions border-t border-border/30 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => acceptSuggestion(i)}
                        disabled={!canApply && !accepted}
                        className={`btn text-xs flex-1 py-1.5 ${accepted ? "btn-primary" : "btn-outline"} ${!canApply && !accepted ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={!canApply && !accepted ? t("suggestionNotLocated") : undefined}
                      >
                        {accepted ? t("acceptedChange") : t("acceptAndApply")}
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectSuggestion(i)}
                        className={`btn text-xs flex-1 py-1.5 ${!accepted ? "btn-primary" : "btn-outline"}`}
                      >
                        {t("rejectChange")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="revise-editor-footer revise-editor-footer--pro">
          <p className="text-sm text-ink-light font-sans">
            {usesOriginalLayout ? t("editorFooterOriginalLayout") : t("editorFooterDownloadOnly")}
          </p>
          {downloadError && (
            <p className="text-red-600 text-xs mt-2 font-sans">{downloadError}</p>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
