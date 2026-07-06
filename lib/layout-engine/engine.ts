import {
  advanceLayoutContext,
  buildBlockEvalContext,
  createInitialContext,
} from "./classify";
import {
  applyDynamicStyleAdjustments,
  resolveLayoutStyle,
} from "./conditions";
import { parseLayoutBlocks, renderStyledParagraphHtml, resolveTemplateId } from "./parse-render";
import { STYLE_REGISTRY, getParagraphStyleSpec } from "./styles";
import { getLayoutTemplate, defaultTemplateForLocale } from "./templates";
import type {
  LayoutEngineOptions,
  LayoutEngineResult,
  LayoutStyleId,
  LayoutTemplateId,
  StyledLayoutBlock,
} from "./types";

/**
 * Contract layout engine — loops all blocks, evaluates conditional rules,
 * applies dynamic style adjustments, and emits TipTap-compatible HTML.
 */
export function runLayoutEngine(
  content: string,
  opts: LayoutEngineOptions = {}
): LayoutEngineResult {
  const templateId = resolveTemplateId(opts);
  const locale = opts.locale ?? STYLE_REGISTRY[templateId]?.locale ?? "zh";
  const template = getLayoutTemplate(templateId);

  if (!template) {
    throw new Error(`Unknown layout template: ${templateId}`);
  }

  const blocks = parseLayoutBlocks(content, locale);
  const loopCtx = createInitialContext(locale);
  const styled: StyledLayoutBlock[] = [];
  const stats = {} as Record<LayoutStyleId, number>;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const evalCtx = buildBlockEvalContext(block, loopCtx, blocks.length);

    let { styleId, ruleId } = resolveLayoutStyle(
      template.rules,
      evalCtx,
      template.defaultStyle
    );

    styleId = applyDynamicStyleAdjustments(styleId, evalCtx);

    const spec = getParagraphStyleSpec(templateId, styleId);
    const html = renderStyledParagraphHtml(block.text, spec, {
      role: block.role,
      styleId,
      ruleId,
    });

    styled.push({
      ...block,
      styleId,
      html,
      matchedRuleId: ruleId,
    });

    stats[styleId] = (stats[styleId] ?? 0) + 1;

    if (
      block.role === "articleHeading" ||
      block.role === "enArticle" ||
      block.role === "enSection"
    ) {
      loopCtx.lastHeadingIndex = i;
    }

    advanceLayoutContext(loopCtx, block, styleId);
  }

  return {
    html: styled.length ? styled.map((b) => b.html).join("") : "<p></p>",
    blocks: styled,
    templateId,
    stats,
  };
}

/** Convenience: format with locale-default template. */
export function layoutFormatPlainText(
  content: string,
  locale: "zh" | "en" = "zh"
): LayoutEngineResult {
  return runLayoutEngine(content, {
    templateId: defaultTemplateForLocale(locale),
    locale,
  });
}

export function documentFormatIdToTemplateId(
  formatId: string
): LayoutTemplateId {
  if (
    formatId === "zh-standard" ||
    formatId === "zh-formal" ||
    formatId === "en-standard" ||
    formatId === "en-formal"
  ) {
    return formatId;
  }
  return "zh-standard";
}

export type { LayoutEngineResult, LayoutTemplateId, LayoutStyleId };
