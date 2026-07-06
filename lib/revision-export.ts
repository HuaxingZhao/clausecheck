import type { ContractChange } from "./types";
import { formatContractText } from "./contract-format";
import { buildNormIndex, findRangeWithFallbacks } from "./redline";
import { snapChangesToSource } from "./redline";

export interface PreparedExportChange extends ContractChange {
  /** 用于「修订后全文」的条款表述（可能由建议推导） */
  exportRevised: string;
  /** 原始 AI 建议（说明性文字时保留展示） */
  advisoryNote?: string;
  /** 是否为说明性建议（非完整替换句） */
  isAdvisory: boolean;
  /** 是否能在全文中定位并应用 */
  locatable: boolean;
}

const ADVISORY_PREFIX = /^建议|^宜|^应当|^建议将|^建议把|^可考虑|^推荐/i;

/** 判断建议是否为说明性文字，而非可直接替换的完整条款 */
export function isAdvisoryRevision(original: string, revised: string): boolean {
  const o = original.trim();
  const r = revised.trim();
  if (!o || !r) return false;
  if (ADVISORY_PREFIX.test(r)) return true;
  if (r.length < o.length * 0.45) return true;

  const oHead = o.slice(0, Math.min(16, o.length)).replace(/\s/g, "");
  const rHead = r.slice(0, Math.min(16, r.length)).replace(/\s/g, "");
  if (oHead.length >= 6 && rHead.length >= 4) {
    const shared = oHead.slice(0, 6) === rHead.slice(0, 6) || r.includes(o.slice(0, 8));
    if (!shared && r.length < o.length * 0.75) return true;
  }
  return false;
}

/** 从说明性建议推导可写入合同的条款表述（如 30日→60日） */
export function deriveRevisedClause(original: string, advisory: string): string | null {
  const o = original.trim();
  const a = advisory.trim();
  if (!o || !a) return null;

  const dayFromAdvice =
    a.match(
      /(?:延长(?:至|到)|改为|调整为|缩短(?:至|到)|延长)\s*(\d+)\s*(?:个)?\s*(?:自然)?[天日]/
    )?.[1] ??
    a.match(/(\d+)\s*个\s*自然\s*[天日]/)?.[1] ??
    a.match(/(\d+)\s*[天日]/)?.[1];

  if (dayFromAdvice) {
    let next = o.replace(/(\d+)\s*个\s*自然\s*日/g, `${dayFromAdvice} 个自然日`);
    if (next !== o) return next;
    next = o.replace(/(\d+)\s*个\s*自然\s*天/g, `${dayFromAdvice} 个自然日`);
    if (next !== o) return next;
    next = o.replace(/(\d+)\s*个\s*工作日/g, `${dayFromAdvice} 个工作日`);
    if (next !== o) return next;
    next = o.replace(/(\d+)\s*日(?!历)/g, `${dayFromAdvice}日`);
    if (next !== o) return next;
    next = o.replace(/(\d+)\s*天/g, `${dayFromAdvice}天`);
    if (next !== o) return next;
  }

  const pctFromAdvice = a.match(/(\d+(?:\.\d+)?)\s*%|百分之([一二三四五六七八九十百\d]+)/);
  if (pctFromAdvice) {
    const pct = pctFromAdvice[1] ?? pctFromAdvice[2];
    if (pct) {
      const next = o.replace(/(\d+(?:\.\d+)?)\s*%/g, `${pct}%`);
      if (next !== o) return next;
    }
  }

  const amountFromAdvice = a.match(/(?:降至|降至|不超过|上限(?:为)?)\s*(\d+(?:\.\d+)?)\s*(万|元|USD|SGD|CNY)?/i);
  if (amountFromAdvice) {
    const num = amountFromAdvice[1];
    const unit = amountFromAdvice[2] ?? "";
    const next = o.replace(/(\d+(?:\.\d+)?)\s*(万|元|USD|SGD|CNY)?/gi, (_, n, u) => {
      if (unit && u && unit.toLowerCase() !== String(u).toLowerCase()) return `${n}${u}`;
      return `${num}${unit || u || ""}`;
    });
    if (next !== o) return next;
  }

  return null;
}

export function prepareChangesForExport(
  contractText: string,
  changes: ContractChange[]
): PreparedExportChange[] {
  const source = formatContractText(contractText.replace(/\r\n/g, "\n"));
  const snapped = snapChangesToSource(source, changes, { format: false });

  return snapped.map((change) => {
    const original = change.original?.trim() ?? "";
    const revised = change.revised?.trim() ?? "";
    const advisory = isAdvisoryRevision(original, revised);
    const derived = advisory ? deriveRevisedClause(original, revised) : null;
    const exportRevised = advisory ? (derived ?? "") : revised;

    const ni = buildNormIndex(source);
    const locatable = !!original && !!findRangeWithFallbacks(ni, original);

    return {
      ...change,
      exportRevised,
      advisoryNote: advisory ? revised : undefined,
      isAdvisory: advisory,
      locatable,
    };
  });
}

/** 在合同全文中应用已推导的修订（精确匹配 + 模糊定位） */
export function applyRevisionsToContractText(
  contractText: string,
  prepared: PreparedExportChange[]
): { text: string; appliedCount: number } {
  const source = formatContractText(contractText.replace(/\r\n/g, "\n"));
  let text = source;

  const ordered = prepared
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.original?.trim() && p.exportRevised?.trim())
    .sort((a, b) => b.p.original!.length - a.p.original!.length);

  let appliedCount = 0;

  for (const { p } of ordered) {
    const original = p.original!.trim();
    const replacement = p.exportRevised.trim();

    if (text.includes(original)) {
      text = text.replace(original, replacement);
      appliedCount++;
      continue;
    }

    const ni = buildNormIndex(text);
    const found = findRangeWithFallbacks(ni, original);
    if (found) {
      text = text.slice(0, found.start) + replacement + text.slice(found.end);
      appliedCount++;
    }
  }

  return { text, appliedCount };
}

/** 构建用于修订后全文的 changes（使用推导后的条款表述） */
export function toAppliedChanges(prepared: PreparedExportChange[]): ContractChange[] {
  return prepared
    .filter((p) => p.original?.trim() && p.exportRevised?.trim())
    .map((p) => ({
      section: p.section,
      original: p.original,
      revised: p.exportRevised,
      reason: p.reason,
    }));
}

export function countExportApplied(prepared: PreparedExportChange[]): number {
  return prepared.filter((p) => p.exportRevised?.trim()).length;
}
