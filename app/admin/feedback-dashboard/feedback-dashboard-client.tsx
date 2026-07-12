"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Overview {
  total: number;
  accurate: number;
  missedIssue: number;
  falsePositive: number;
  accuratePct: number;
  missedIssuePct: number;
  falsePositivePct: number;
  byJurisdiction: { jurisdiction: string; count: number }[];
}

interface DailyPoint {
  date: string;
  count: number;
  accurate: number;
  accurateRate: number;
  promptVersion: string;
}

interface BadCaseSample {
  id: string;
  comment: string | null;
  promptVersion: string;
  createdAt: string;
  ragMetadata: {
    packId: string;
    retrievedChunkIds: string[];
    degraded: boolean;
  };
  contractHash: string;
}

interface BadCaseRow {
  feedbackType: string;
  jurisdiction: string;
  targetId: string;
  commentSummary: string;
  count: number;
  contractHashes: string[];
  samples: BadCaseSample[];
}

interface DashboardPayload {
  sinceDays: number;
  overview: Overview;
  daily: DailyPoint[];
  badCases: BadCaseRow[];
}

const PIE_COLORS = ["#0f766e", "#b45309", "#1d4ed8", "#be123c", "#64748b", "#7c3aed"];
const VERSION_COLORS = ["#0f766e", "#b45309", "#1d4ed8", "#be123c", "#64748b"];

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="text-xs text-slate-400 mt-1">{sub}</p> : null}
    </div>
  );
}

function typeLabel(t: string) {
  if (t === "missed_issue") return "Missed Issue";
  if (t === "false_positive") return "False Positive";
  if (t === "accurate") return "Accurate";
  return t;
}

export default function FeedbackDashboardClient({
  initialData,
}: {
  initialData?: DashboardPayload | null;
}) {
  const [data, setData] = useState<DashboardPayload | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    fetch("/api/admin/feedback?sinceDays=30", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<DashboardPayload>;
      })
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Load failed")
      )
      .finally(() => setLoading(false));
  }, [initialData]);

  const trendRows = useMemo(() => {
    if (!data?.daily.length) return [];
    const dates = [...new Set(data.daily.map((d) => d.date))].sort();
    const versions = [...new Set(data.daily.map((d) => d.promptVersion))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      let volume = 0;
      for (const v of versions) {
        const hit = data.daily.find((d) => d.date === date && d.promptVersion === v);
        row[`vol_${v}`] = hit?.count ?? 0;
        row[`acc_${v}`] = hit?.accurateRate ?? 0;
        volume += hit?.count ?? 0;
      }
      row.volume = volume;
      return row;
    });
  }, [data]);

  const versions = useMemo(
    () =>
      data ? [...new Set(data.daily.map((d) => d.promptVersion))].sort() : [],
    [data]
  );

  if (loading) {
    return <p className="text-slate-500">加载中…</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
        {error ?? "无法加载反馈看板"}
      </div>
    );
  }

  const { overview, badCases } = data;
  const pieData = overview.byJurisdiction.map((j) => ({
    name: j.jurisdiction || "unknown",
    value: j.count,
  }));

  function exportUrl(format: "csv" | "json") {
    return `/api/admin/feedback?format=${format}&sinceDays=${data!.sinceDays}`;
  }

  return (
    <div className="space-y-8" data-testid="feedback-dashboard">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            反馈分析看板
          </h2>
          <p className="text-sm text-slate-500">
            近 {data.sinceDays} 天结构化反馈 · Missed / False Positive → Few-shot 候选
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportUrl("csv")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            导出 CSV
          </a>
          <a
            href={exportUrl("json")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            导出 JSON
          </a>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4"
        data-testid="feedback-overview"
      >
        <MetricCard label="总反馈数" value={String(overview.total)} />
        <MetricCard
          label="Accurate %"
          value={`${overview.accuratePct}%`}
          sub={`${overview.accurate} 条`}
        />
        <MetricCard
          label="Missed Issue %"
          value={`${overview.missedIssuePct}%`}
          sub={`${overview.missedIssue} 条`}
        />
        <MetricCard
          label="False Positive %"
          value={`${overview.falsePositivePct}%`}
          sub={`${overview.falsePositive} 条`}
        />
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-slate-500 mb-2">按 Jurisdiction</p>
          <div className="h-28">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-400">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={48}
                    label={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500 max-h-16 overflow-auto">
            {pieData.map((p, i) => (
              <li key={p.name} className="flex justify-between gap-2">
                <span className="truncate">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {p.name}
                </span>
                <span>{p.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-1">30 日趋势</h3>
        <p className="text-xs text-slate-500 mb-4">
          日反馈量（柱状近似用折线）+ Accurate%（按 promptVersion 着色）
        </p>
        <div className="h-72">
          {trendRows.length === 0 ? (
            <p className="text-sm text-slate-400">暂无趋势数据</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="volume"
                  name="日反馈量"
                  stroke="#334155"
                  strokeWidth={2}
                  dot={false}
                />
                {versions.map((v, i) => (
                  <Line
                    key={v}
                    yAxisId="right"
                    type="monotone"
                    dataKey={`acc_${v}`}
                    name={`Accurate% ${v}`}
                    stroke={VERSION_COLORS[i % VERSION_COLORS.length]}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section
        className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm"
        data-testid="feedback-bad-cases"
      >
        <h3 className="font-semibold text-slate-900 mb-1">Bad Case 列表</h3>
        <p className="text-xs text-slate-500 mb-4">
          Missed Issue + False Positive · 按频次降序
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Jurisdiction</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">Comment</th>
                <th className="py-2 pr-3 text-right">Count</th>
                <th className="py-2">Hashes</th>
              </tr>
            </thead>
            <tbody>
              {badCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-slate-400 text-center">
                    暂无 Bad Case
                  </td>
                </tr>
              ) : (
                badCases.map((row) => {
                  const key = `${row.feedbackType}|${row.jurisdiction}|${row.targetId}|${row.commentSummary}`;
                  const open = expanded === key;
                  return (
                    <Fragment key={key}>
                      <tr
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setExpanded(open ? null : key)}
                      >
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                              row.feedbackType === "missed_issue"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-rose-100 text-rose-900"
                            }`}
                          >
                            {typeLabel(row.feedbackType)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs">
                          {row.jurisdiction}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs">
                          {row.targetId}
                        </td>
                        <td className="py-2.5 pr-3 max-w-xs truncate text-slate-700">
                          {row.commentSummary}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold">
                          {row.count}
                        </td>
                        <td className="py-2.5 font-mono text-[10px] text-slate-500">
                          {row.contractHashes
                            .slice(0, 2)
                            .map((h) => h.slice(0, 8))
                            .join(", ")}
                          {row.contractHashes.length > 2
                            ? ` +${row.contractHashes.length - 2}`
                            : ""}
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="p-4 text-xs space-y-3">
                            {row.samples.map((s) => (
                              <div
                                key={s.id}
                                className="rounded-lg border border-slate-200 bg-white p-3 space-y-1"
                              >
                                <p>
                                  <span className="text-slate-500">comment: </span>
                                  {s.comment || "(none)"}
                                </p>
                                <p>
                                  <span className="text-slate-500">promptVersion: </span>
                                  {s.promptVersion}
                                </p>
                                <p>
                                  <span className="text-slate-500">createdAt: </span>
                                  {s.createdAt}
                                </p>
                                <p>
                                  <span className="text-slate-500">contractHash: </span>
                                  <span className="font-mono">{s.contractHash}</span>
                                </p>
                                <pre className="mt-1 overflow-auto rounded bg-slate-900 text-slate-100 p-2 text-[10px]">
                                  {JSON.stringify(s.ragMetadata, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
