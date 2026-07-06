"use client";

import { useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import WordTooltip from "./word-tooltip";
import {
  IconAlignCenter,
  IconAlignJustify,
  IconAlignLeft,
  IconAlignRight,
  IconBulletList,
  IconChangeCase,
  IconClearFormat,
  IconDecreaseIndent,
  IconFontColor,
  IconGrowFont,
  IconHighlight,
  IconIncreaseIndent,
  IconNumberedList,
  IconRedo,
  IconShrinkFont,
  IconStrikethrough,
  IconSubscript,
  IconSuperscript,
  IconUndo,
} from "./word-editor-icons";
import {
  DOCUMENT_FORMAT_PRESETS,
  type ContractParagraphStyleId,
  type DocumentFormatId,
} from "@/lib/contract-paragraph-styles";

const PARAGRAPH_STYLES: { id: ContractParagraphStyleId; labelKey: string }[] = [
  { id: "normal", labelKey: "styleNormal" },
  { id: "title", labelKey: "styleTitle" },
  { id: "articleHeading", labelKey: "styleArticleHeading" },
  { id: "clauseHeading", labelKey: "styleClauseHeading" },
  { id: "partyBlock", labelKey: "stylePartyBlock" },
  { id: "signature", labelKey: "styleSignature" },
];

const FORMAT_PRESETS: { id: DocumentFormatId; labelKey: string }[] = [
  { id: "zh-standard", labelKey: "formatZhStandard" },
  { id: "zh-formal", labelKey: "formatZhFormal" },
  { id: "en-standard", labelKey: "formatEnStandard" },
  { id: "en-formal", labelKey: "formatEnFormal" },
];

const FONT_FAMILIES = [
  { label: "Aptos (Body)", value: "Aptos, Calibri, Arial, sans-serif" },
  { label: "Calibri", value: "Calibri, Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "SimSun", value: "SimSun, STSong, serif" },
  { label: "Microsoft YaHei", value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
];

const FONT_SIZES_PT = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ffffff"];
const FONT_COLORS = ["#000000", "#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c"];

function ptToCss(pt: number): string {
  return `${pt}pt`;
}

function parseCurrentSizePt(editor: Editor): number {
  const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
  if (!raw) return 12;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 12;
}

function nearestSizeIndex(pt: number): number {
  let best = 0;
  let diff = Infinity;
  FONT_SIZES_PT.forEach((size, i) => {
    const d = Math.abs(size - pt);
    if (d < diff) {
      diff = d;
      best = i;
    }
  });
  return best;
}

function changeCase(text: string, mode: "lower" | "upper" | "title"): string {
  if (mode === "lower") return text.toLowerCase();
  if (mode === "upper") return text.toUpperCase();
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function RibbonButton({
  active,
  disabled,
  title,
  onClick,
  children,
  wide,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <WordTooltip label={title}>
      <button
        type="button"
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className={`word-ribbon-btn ${wide ? "word-ribbon-btn--wide" : ""} ${active ? "word-ribbon-btn--active" : ""}`}
      >
        {children}
      </button>
    </WordTooltip>
  );
}

function RibbonSep() {
  return <span className="word-ribbon-sep" aria-hidden />;
}

interface ContractRichTextToolbarProps {
  editor: Editor | null;
  locale?: string;
  activeParagraphStyle?: ContractParagraphStyleId;
  onParagraphStyle?: (styleId: ContractParagraphStyleId) => void;
  onAutoFormat?: (presetId?: DocumentFormatId) => void;
}

export default function ContractRichTextToolbar({
  editor,
  locale = "zh",
  activeParagraphStyle = "normal",
  onParagraphStyle,
  onAutoFormat,
}: ContractRichTextToolbarProps) {
  const t = useTranslations("revise");
  const fontColorRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLInputElement>(null);
  const caseRef = useRef<HTMLSelectElement>(null);

  const bumpFontSize = useCallback(
    (delta: number) => {
      if (!editor) return;
      const current = parseCurrentSizePt(editor);
      const idx = nearestSizeIndex(current);
      const nextIdx = Math.max(0, Math.min(FONT_SIZES_PT.length - 1, idx + delta));
      editor.chain().focus().setFontSize(ptToCss(FONT_SIZES_PT[nextIdx]!)).run();
    },
    [editor]
  );

  if (!editor) return null;

  const currentFont =
    FONT_FAMILIES.find((f) => editor.isActive("textStyle", { fontFamily: f.value }))?.value ?? "";

  const currentSizePt = parseCurrentSizePt(editor);
  const currentSizeCss = ptToCss(currentSizePt);

  const fontColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#000000";
  const highlightColor =
    (editor.getAttributes("highlight").color as string | undefined) ?? "#fef08a";

  function applyCase(mode: "lower" | "upper" | "title") {
    const { from, to } = editor!.state.selection;
    if (from === to) return;
    const selected = editor!.state.doc.textBetween(from, to, " ");
    editor!.chain().focus().insertContentAt({ from, to }, changeCase(selected, mode)).run();
  }

  return (
    <div className="word-ribbon" role="toolbar" aria-label={t("editorToolbarLabel")}>
      {/* Row 1 — font & paragraph (Word Home tab, top row) */}
      <div className="word-ribbon-row">
        <div className="word-ribbon-group">
          <RibbonButton
            title={t("toolbarUndo")}
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <IconUndo className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarRedo")}
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <IconRedo className="word-ribbon-icon" />
          </RibbonButton>
        </div>

        <RibbonSep />

        <RibbonSep />

        <div className="word-ribbon-group word-ribbon-group--styles">
          <WordTooltip label={t("toolbarParagraphStyle")}>
            <select
              className="word-ribbon-style-select"
              aria-label={t("toolbarParagraphStyle")}
              value={activeParagraphStyle}
              onChange={(e) =>
                onParagraphStyle?.(e.target.value as ContractParagraphStyleId)
              }
            >
              {PARAGRAPH_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </WordTooltip>

          {onAutoFormat && (
            <WordTooltip label={t("toolbarDocumentFormat")}>
              <select
                className="word-ribbon-format-select"
                aria-label={t("toolbarDocumentFormat")}
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value as DocumentFormatId;
                  if (!id) return;
                  onAutoFormat(id);
                  e.target.value = "";
                }}
              >
                <option value="">{t("toolbarDocumentFormatPlaceholder")}</option>
                {FORMAT_PRESETS.filter((p) =>
                  DOCUMENT_FORMAT_PRESETS.find((d) => d.id === p.id)?.locale ===
                  (locale === "en" ? "en" : "zh")
                ).map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
            </WordTooltip>
          )}

          {onAutoFormat && (
            <RibbonButton
              title={t("toolbarAutoFormat")}
              onClick={() =>
                onAutoFormat(locale === "en" ? "en-standard" : "zh-standard")
              }
              wide
            >
              <span className="word-ribbon-format-label">{t("toolbarAutoFormatShort")}</span>
            </RibbonButton>
          )}
        </div>

        <RibbonSep />

        <div className="word-ribbon-group word-ribbon-group--font">
          <WordTooltip label={t("toolbarFontFamily")}>
            <select
              className="word-ribbon-font-select"
              aria-label={t("toolbarFontFamily")}
              title={t("toolbarFontFamily")}
              value={currentFont}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) editor.chain().focus().unsetFontFamily().run();
                else editor.chain().focus().setFontFamily(value).run();
              }}
            >
              <option value="">{t("toolbarFontDefault")}</option>
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </WordTooltip>

          <WordTooltip label={t("toolbarFontSize")}>
            <select
              className="word-ribbon-size-select"
              aria-label={t("toolbarFontSize")}
              title={t("toolbarFontSize")}
              value={currentSizeCss}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) editor.chain().focus().unsetFontSize().run();
                else editor.chain().focus().setFontSize(value).run();
              }}
            >
              {FONT_SIZES_PT.map((size) => (
                <option key={size} value={ptToCss(size)}>
                  {size}
                </option>
              ))}
            </select>
          </WordTooltip>

          <RibbonButton title={t("toolbarGrowFont")} onClick={() => bumpFontSize(1)}>
            <IconGrowFont className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton title={t("toolbarShrinkFont")} onClick={() => bumpFontSize(-1)}>
            <IconShrinkFont className="word-ribbon-icon" />
          </RibbonButton>
        </div>

        <RibbonSep />

        <div className="word-ribbon-group">
          <div className="word-ribbon-case-wrap">
            <RibbonButton
              title={t("toolbarChangeCase")}
              onClick={() => caseRef.current?.showPicker?.() ?? caseRef.current?.click()}
            >
              <IconChangeCase className="word-ribbon-icon" />
            </RibbonButton>
            <select
              ref={caseRef}
              className="word-ribbon-case-select"
              aria-label={t("toolbarChangeCase")}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === "lower" || v === "upper" || v === "title") applyCase(v);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                {t("toolbarChangeCase")}
              </option>
              <option value="lower">{t("toolbarCaseLower")}</option>
              <option value="upper">{t("toolbarCaseUpper")}</option>
              <option value="title">{t("toolbarCaseTitle")}</option>
            </select>
          </div>
          <RibbonButton
            title={t("toolbarClearFormat")}
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <IconClearFormat className="word-ribbon-icon" />
          </RibbonButton>
        </div>

        <RibbonSep />

        <div className="word-ribbon-group">
          <RibbonButton
            title={t("toolbarBulletList")}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <IconBulletList className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarOrderedList")}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <IconNumberedList className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarDecreaseIndent")}
            onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          >
            <IconDecreaseIndent className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarIncreaseIndent")}
            onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          >
            <IconIncreaseIndent className="word-ribbon-icon" />
          </RibbonButton>
        </div>
      </div>

      {/* Row 2 — character formatting & alignment (Word Home tab, bottom row) */}
      <div className="word-ribbon-row">
        <div className="word-ribbon-group word-ribbon-group--format">
          <RibbonButton
            title={t("toolbarBold")}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="word-ribbon-char word-ribbon-char--bold">B</span>
          </RibbonButton>
          <RibbonButton
            title={t("toolbarItalic")}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="word-ribbon-char word-ribbon-char--italic">I</span>
          </RibbonButton>
          <RibbonButton
            title={t("toolbarUnderline")}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="word-ribbon-char word-ribbon-char--underline">U</span>
          </RibbonButton>
          <RibbonButton
            title={t("toolbarStrike")}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <IconStrikethrough className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarSubscript")}
            active={editor.isActive("subscript")}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <IconSubscript className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarSuperscript")}
            active={editor.isActive("superscript")}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <IconSuperscript className="word-ribbon-icon" />
          </RibbonButton>
        </div>

        <RibbonSep />

        <div className="word-ribbon-group word-ribbon-group--colors">
          <div className="word-ribbon-color-wrap">
            <RibbonButton
              title={t("toolbarFontColor")}
              onClick={() => fontColorRef.current?.click()}
            >
              <IconFontColor className="word-ribbon-icon" color={fontColor} />
            </RibbonButton>
            <input
              ref={fontColorRef}
              type="color"
              className="word-ribbon-color-input"
              value={fontColor.startsWith("#") ? fontColor : "#000000"}
              aria-label={t("toolbarFontColor")}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
            <div className="word-ribbon-color-swatches">
              {FONT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="word-ribbon-swatch"
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={t("toolbarFontColor")}
                  onClick={() => editor.chain().focus().setColor(c).run()}
                />
              ))}
            </div>
          </div>

          <div className="word-ribbon-color-wrap">
            <RibbonButton
              title={t("toolbarHighlight")}
              active={editor.isActive("highlight")}
              onClick={() => highlightRef.current?.click()}
            >
              <IconHighlight className="word-ribbon-icon" color={highlightColor} />
            </RibbonButton>
            <input
              ref={highlightRef}
              type="color"
              className="word-ribbon-color-input"
              value={highlightColor.startsWith("#") ? highlightColor : "#fef08a"}
              aria-label={t("toolbarHighlight")}
              onChange={(e) =>
                editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
              }
            />
            <div className="word-ribbon-color-swatches">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="word-ribbon-swatch word-ribbon-swatch--highlight"
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={t("toolbarHighlight")}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                />
              ))}
            </div>
          </div>
        </div>

        <RibbonSep />

        <div className="word-ribbon-group word-ribbon-group--align">
          <RibbonButton
            title={t("toolbarAlignLeft")}
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <IconAlignLeft className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarAlignCenter")}
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <IconAlignCenter className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarAlignRight")}
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <IconAlignRight className="word-ribbon-icon" />
          </RibbonButton>
          <RibbonButton
            title={t("toolbarAlignJustify")}
            active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <IconAlignJustify className="word-ribbon-icon" />
          </RibbonButton>
        </div>
      </div>
    </div>
  );
}
