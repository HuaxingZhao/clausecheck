/**
 * Read-only feedback queries for admin analytics + few-shot extraction.
 * Never mutates feedback rows.
 */

import { readFile } from "fs/promises";
import path from "path";
import { ensureSchema, getSql, usePostgres } from "./pg";
import type {
  FeedbackRecord,
  FeedbackType,
  RagFeedbackMetadata,
} from "../feedback/types";

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

export interface FeedbackListFilters {
  feedbackTypes?: FeedbackType[];
  jurisdiction?: string;
  sinceDays?: number;
  promptVersion?: string;
  /** Force read from data/feedback.json even when DATABASE_URL is set. */
  preferLocalJson?: boolean;
}

export interface FeedbackOverview {
  total: number;
  accurate: number;
  missedIssue: number;
  falsePositive: number;
  accuratePct: number;
  missedIssuePct: number;
  falsePositivePct: number;
  byJurisdiction: { jurisdiction: string; count: number }[];
}

export interface FeedbackDailyPoint {
  date: string;
  count: number;
  accurate: number;
  accurateRate: number;
  promptVersion: string;
}

export interface FeedbackBadCaseRow {
  feedbackType: FeedbackType;
  jurisdiction: string;
  targetId: string;
  commentSummary: string;
  count: number;
  contractHashes: string[];
  samples: FeedbackRecord[];
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

function parseRag(raw: unknown): RagFeedbackMetadata {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return {
      packId: typeof o.packId === "string" ? o.packId : "unknown",
      retrievedChunkIds: Array.isArray(o.retrievedChunkIds)
        ? o.retrievedChunkIds.map(String)
        : [],
      degraded: Boolean(o.degraded),
    };
  }
  return { packId: "unknown", retrievedChunkIds: [], degraded: false };
}

function rowFromPg(r: Record<string, unknown>): FeedbackRecord {
  return {
    id: String(r.id),
    contractHash: String(r.contract_hash),
    jurisdiction: String(r.jurisdiction || ""),
    promptVersion: String(r.prompt_version || ""),
    ragMetadata: parseRag(r.rag_metadata),
    targetType: r.target_type as FeedbackRecord["targetType"],
    targetId: String(r.target_id),
    feedbackType: r.feedback_type as FeedbackType,
    comment: r.comment == null ? null : String(r.comment),
    userId: r.user_id == null ? null : String(r.user_id),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
  };
}

async function loadAllJson(): Promise<FeedbackRecord[]> {
  try {
    return JSON.parse(await readFile(FEEDBACK_FILE, "utf8")) as FeedbackRecord[];
  } catch {
    return [];
  }
}

function applyFilters(
  rows: FeedbackRecord[],
  filters: FeedbackListFilters = {}
): FeedbackRecord[] {
  let out = rows;
  if (filters.feedbackTypes?.length) {
    const set = new Set(filters.feedbackTypes);
    out = out.filter((r) => set.has(r.feedbackType));
  }
  if (filters.jurisdiction) {
    const j = filters.jurisdiction.toLowerCase();
    out = out.filter((r) => r.jurisdiction.toLowerCase() === j);
  }
  if (filters.promptVersion) {
    out = out.filter((r) => r.promptVersion === filters.promptVersion);
  }
  if (filters.sinceDays && filters.sinceDays > 0) {
    const since = Date.now() - filters.sinceDays * 86400000;
    out = out.filter((r) => new Date(r.createdAt).getTime() >= since);
  }
  return out;
}

export async function listFeedback(
  filters: FeedbackListFilters = {}
): Promise<FeedbackRecord[]> {
  if (usePostgres() && !filters.preferLocalJson) {
    await ensureSchema();
    const db = getSql();
    const sinceDays = filters.sinceDays ?? 3650;
    const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
    const rows = await db<Record<string, unknown>[]>`
      SELECT id, contract_hash, jurisdiction, prompt_version, rag_metadata,
             target_type, target_id, feedback_type, comment, user_id, created_at
        FROM feedback
       WHERE created_at >= ${since}::timestamptz
       ORDER BY created_at DESC
       LIMIT 10000`;
    return applyFilters(rows.map(rowFromPg), {
      ...filters,
      sinceDays: undefined,
    });
  }
  return applyFilters(await loadAllJson(), filters);
}

export async function getFeedbackOverview(
  sinceDays = 30,
  opts: { preferLocalJson?: boolean } = {}
): Promise<FeedbackOverview> {
  const rows = await listFeedback({ sinceDays, preferLocalJson: opts.preferLocalJson });
  const accurate = rows.filter((r) => r.feedbackType === "accurate").length;
  const missedIssue = rows.filter((r) => r.feedbackType === "missed_issue").length;
  const falsePositive = rows.filter(
    (r) => r.feedbackType === "false_positive"
  ).length;
  const total = rows.length;
  const byJ = new Map<string, number>();
  for (const r of rows) {
    const key = r.jurisdiction || "unknown";
    byJ.set(key, (byJ.get(key) || 0) + 1);
  }
  const byJurisdiction = [...byJ.entries()]
    .map(([jurisdiction, count]) => ({ jurisdiction, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    accurate,
    missedIssue,
    falsePositive,
    accuratePct: pct(accurate, total),
    missedIssuePct: pct(missedIssue, total),
    falsePositivePct: pct(falsePositive, total),
    byJurisdiction,
  };
}

export async function getFeedbackDailyTrend(
  sinceDays = 30,
  opts: { preferLocalJson?: boolean } = {}
): Promise<FeedbackDailyPoint[]> {
  const rows = await listFeedback({ sinceDays, preferLocalJson: opts.preferLocalJson });
  const map = new Map<
    string,
    { count: number; accurate: number; promptVersion: string }
  >();
  for (const r of rows) {
    const date = r.createdAt.slice(0, 10);
    const key = `${date}||${r.promptVersion || "unknown"}`;
    const cur = map.get(key) || {
      count: 0,
      accurate: 0,
      promptVersion: r.promptVersion || "unknown",
    };
    cur.count += 1;
    if (r.feedbackType === "accurate") cur.accurate += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => {
      const date = key.split("||")[0];
      return {
        date,
        count: v.count,
        accurate: v.accurate,
        accurateRate: pct(v.accurate, v.count),
        promptVersion: v.promptVersion,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.promptVersion.localeCompare(b.promptVersion));
}

export async function getFeedbackBadCases(
  sinceDays = 90,
  opts: { preferLocalJson?: boolean } = {}
): Promise<FeedbackBadCaseRow[]> {
  const rows = await listFeedback({
    sinceDays,
    feedbackTypes: ["missed_issue", "false_positive"],
    preferLocalJson: opts.preferLocalJson,
  });
  const groups = new Map<string, FeedbackRecord[]>();
  for (const r of rows) {
    // Frequency by type + jurisdiction + target (comment varies; shown as summary)
    const key = `${r.feedbackType}|${r.jurisdiction}|${r.targetId}`;
    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }
  const out: FeedbackBadCaseRow[] = [];
  for (const [, list] of groups) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    // Prefer longest non-empty comment as summary
    const withComment = [...list]
      .filter((r) => r.comment?.trim())
      .sort((a, b) => (b.comment?.length || 0) - (a.comment?.length || 0));
    const first = withComment[0] || list[0];
    const comment = first.comment?.trim() || "";
    out.push({
      feedbackType: first.feedbackType,
      jurisdiction: first.jurisdiction,
      targetId: first.targetId,
      commentSummary: comment ? comment.slice(0, 120) : "(no comment)",
      count: list.length,
      contractHashes: [...new Set(list.map((r) => r.contractHash))],
      samples: list.slice(0, 5),
    });
  }
  out.sort(
    (a, b) =>
      b.count - a.count ||
      a.feedbackType.localeCompare(b.feedbackType) ||
      a.targetId.localeCompare(b.targetId)
  );
  return out;
}
