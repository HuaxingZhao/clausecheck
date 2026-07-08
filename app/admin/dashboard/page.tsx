"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Metrics {
  todayNewUsers: number;
  todayPaidOrders: number;
  todayCreditsConsumed: number;
  totalRevenueCents: number;
}

interface DashboardData {
  metrics: Metrics;
  signups: { date: string; count: number }[];
  conversion: {
    date: string;
    signups: number;
    paidOrders: number;
    conversionRate: number;
  }[];
}

function formatCny(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-500">加载中…</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
        {error ?? "无法加载看板数据"}
      </div>
    );
  }

  const { metrics, signups, conversion } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">数据看板</h2>
        <p className="text-sm text-slate-500">核心运营指标（今日 + 累计）</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="今日新增用户" value={String(metrics.todayNewUsers)} />
        <MetricCard label="今日付费订单" value={String(metrics.todayPaidOrders)} />
        <MetricCard label="今日消耗额度" value={String(metrics.todayCreditsConsumed)} />
        <MetricCard label="累计收入" value={formatCny(metrics.totalRevenueCents)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">近 7 日注册用户</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="注册" stroke="#1e3a5f" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">近 7 日付费转化率 (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  name="转化率"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  name="注册"
                  stroke="#64748b"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="paidOrders"
                  name="付费单"
                  stroke="#15803d"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
