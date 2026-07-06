import type { LayoutRule, LayoutTemplate } from "./types";

/** Shared high-priority rules (locale-agnostic role → style). */
const SHARED_RULES: LayoutRule[] = [
  { id: "title", priority: 100, when: { op: "role", role: "documentTitle" }, style: "title", stop: true },
  { id: "appendix", priority: 95, when: { op: "role", role: "appendix" }, style: "appendix", stop: true },
  { id: "signature-role", priority: 94, when: { op: "role", role: "signature" }, style: "signature", stop: true },
  { id: "signature-block", priority: 93, when: { op: "inSignatureBlock" }, style: "signature" },
  { id: "party", priority: 90, when: { op: "role", role: "partyBlock" }, style: "partyBlock", stop: true },
  { id: "preamble", priority: 88, when: { op: "role", role: "preamble" }, style: "preamble", stop: true },
  { id: "list", priority: 70, when: { op: "role", role: "listItem" }, style: "listItem" },
  { id: "sub-clause", priority: 82, when: { op: "role", role: "subClause" }, style: "subClause", stop: true },
  { id: "clause-num", priority: 80, when: { op: "role", role: "clauseNumber" }, style: "clauseHeading", stop: true },
];

const ZH_RULES: LayoutRule[] = [
  ...SHARED_RULES,
  {
    id: "zh-article",
    priority: 92,
    when: { op: "role", role: "articleHeading" },
    style: "articleHeading",
    stop: true,
  },
  {
    id: "zh-first-after-title",
    priority: 60,
    when: {
      op: "and",
      conditions: [
        { op: "indexEq", value: 1 },
        { op: "role", role: "body" },
      ],
    },
    style: "preamble",
  },
  {
    id: "zh-body-in-preamble",
    priority: 55,
    when: {
      op: "and",
      conditions: [{ op: "inPreamble" }, { op: "role", role: "body" }],
    },
    style: "partyBlock",
  },
];

const EN_RULES: LayoutRule[] = [
  ...SHARED_RULES,
  {
    id: "en-recital",
    priority: 89,
    when: { op: "role", role: "enRecital" },
    style: "preamble",
    stop: true,
  },
  {
    id: "en-article",
    priority: 92,
    when: { op: "role", role: ["enArticle", "enSection"] },
    style: "articleHeading",
    stop: true,
  },
  {
    id: "en-whereas-follow",
    priority: 58,
    when: {
      op: "and",
      conditions: [{ op: "afterRole", role: "enRecital" }, { op: "role", role: "body" }],
    },
    style: "bodyFirstInSection",
  },
];

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: "zh-standard",
    locale: "zh",
    labelKey: "formatZhStandard",
    descriptionKey: "layoutTemplateZhStandardDesc",
    defaultStyle: "body",
    styles: {} as LayoutTemplate["styles"],
    rules: ZH_RULES,
  },
  {
    id: "zh-formal",
    locale: "zh",
    labelKey: "formatZhFormal",
    descriptionKey: "layoutTemplateZhFormalDesc",
    defaultStyle: "body",
    styles: {} as LayoutTemplate["styles"],
    rules: ZH_RULES,
  },
  {
    id: "en-standard",
    locale: "en",
    labelKey: "formatEnStandard",
    descriptionKey: "layoutTemplateEnStandardDesc",
    defaultStyle: "body",
    styles: {} as LayoutTemplate["styles"],
    rules: EN_RULES,
  },
  {
    id: "en-formal",
    locale: "en",
    labelKey: "formatEnFormal",
    descriptionKey: "layoutTemplateEnFormalDesc",
    defaultStyle: "body",
    styles: {} as LayoutTemplate["styles"],
    rules: EN_RULES,
  },
];

export function getLayoutTemplate(id: string): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES.find((t) => t.id === id);
}

export function defaultTemplateForLocale(locale: "zh" | "en"): LayoutTemplate["id"] {
  return locale === "zh" ? "zh-standard" : "en-standard";
}

export function templatesForLocale(locale: "zh" | "en"): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter((t) => t.locale === locale);
}
