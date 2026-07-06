import type { BlockEvalContext, LayoutCondition, LayoutStyleId } from "./types";

function matchRole(
  ctx: BlockEvalContext,
  role: BlockEvalContext["block"]["role"] | BlockEvalContext["block"]["role"][]
): boolean {
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(ctx.block.role);
}

function matchRegex(ctx: BlockEvalContext, pattern: string, flags?: string): boolean {
  try {
    return new RegExp(pattern, flags).test(ctx.block.text);
  } catch {
    return false;
  }
}

/** Evaluate a declarative layout condition against the current block context. */
export function evaluateLayoutCondition(
  condition: LayoutCondition,
  ctx: BlockEvalContext
): boolean {
  switch (condition.op) {
    case "role":
      return matchRole(ctx, condition.role);
    case "regex":
      return matchRegex(ctx, condition.pattern, condition.flags);
    case "first":
      return ctx.isFirst;
    case "last":
      return ctx.isLast;
    case "empty":
      return ctx.block.isEmpty;
    case "notEmpty":
      return !ctx.block.isEmpty;
    case "indexEq":
      return ctx.index === condition.value;
    case "indexLt":
      return ctx.index < condition.value;
    case "indexGt":
      return ctx.index > condition.value;
    case "paragraphsSinceHeading":
      if (condition.eq != null && ctx.paragraphsSinceHeading !== condition.eq) return false;
      if (condition.lt != null && ctx.paragraphsSinceHeading >= condition.lt) return false;
      if (condition.gt != null && ctx.paragraphsSinceHeading <= condition.gt) return false;
      return true;
    case "inPreamble":
      return ctx.inPreamble;
    case "inSignatureBlock":
      return ctx.inSignatureBlock;
    case "afterRole":
      return ctx.previousRole === condition.role;
    case "previousStyle": {
      const styles = Array.isArray(condition.style) ? condition.style : [condition.style];
      return ctx.previousStyle != null && styles.includes(ctx.previousStyle);
    }
    case "and":
      return condition.conditions.every((c) => evaluateLayoutCondition(c, ctx));
    case "or":
      return condition.conditions.some((c) => evaluateLayoutCondition(c, ctx));
    case "not":
      return !evaluateLayoutCondition(condition.condition, ctx);
    default:
      return false;
  }
}

/** Pick the highest-priority matching rule; optional stop flag halts lower rules. */
export function resolveLayoutStyle(
  rules: { id: string; priority: number; when: LayoutCondition; style: LayoutStyleId; stop?: boolean }[],
  ctx: BlockEvalContext,
  defaultStyle: LayoutStyleId
): { styleId: LayoutStyleId; ruleId: string | null } {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (evaluateLayoutCondition(rule.when, ctx)) {
      return { styleId: rule.style, ruleId: rule.id };
    }
    if (rule.stop) break;
  }

  return { styleId: defaultStyle, ruleId: null };
}

/** Dynamic post-rule adjustments based on loop context. */
export function applyDynamicStyleAdjustments(
  styleId: LayoutStyleId,
  ctx: BlockEvalContext
): LayoutStyleId {
  if (
    styleId === "body" &&
    ctx.paragraphsSinceHeading === 1 &&
    !ctx.inPreamble &&
    !ctx.inSignatureBlock &&
    ctx.block.role === "body"
  ) {
    return "bodyFirstInSection";
  }

  if (
    ctx.inSignatureBlock &&
    styleId === "body" &&
    /(签字|盖章|日期|Signature|Date|Name)/i.test(ctx.block.text)
  ) {
    return "signature";
  }

  if (
    ctx.locale === "zh" &&
    styleId === "body" &&
    ctx.paragraphsSinceHeading === 0 &&
    (ctx.block.role === "clauseNumber" || ctx.block.role === "subClause")
  ) {
    return ctx.block.role === "subClause" ? "subClause" : "clauseHeading";
  }

  return styleId;
}
