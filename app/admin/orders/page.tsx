"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminOrder {
  id: string;
  userId: string;
  userEmail: string;
  plan: string;
  amountCents: number;
  creditsAmount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

function formatCny(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN");
}

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "failed", label: "失败" },
  { value: "cancelled", label: "已取消" },
];

const PLAN_OPTIONS = [
  { value: "all", label: "全部套餐" },
  { value: "pro", label: "专业版 pro" },
  { value: "boost", label: "加油包 boost" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (plan !== "all") params.set("plan", plan);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());

    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = (await res.json()) as { orders: AdminOrder[] };
      setOrders(data.orders);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [status, plan, from, to]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">订单管理</h2>
        <p className="text-sm text-slate-500">WeChat 充值订单 · 最近 500 条</p>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">支付状态</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 min-w-[140px]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">套餐类型</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 min-w-[140px]"
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">开始日期</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">结束日期</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
        >
          筛选
        </button>
      </div>

      {loading && <p className="text-slate-500">加载中…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">订单号</th>
                <th className="text-left px-4 py-3 font-medium">用户邮箱</th>
                <th className="text-left px-4 py-3 font-medium">套餐</th>
                <th className="text-right px-4 py-3 font-medium">金额</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{o.userEmail}</td>
                  <td className="px-4 py-3">
                    {o.plan}
                    <span className="text-slate-400 ml-1">({o.creditsAmount} 额度)</span>
                  </td>
                  <td className="px-4 py-3 text-right">{formatCny(o.amountCents)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                    {o.paidAt && (
                      <span className="block text-xs text-slate-400 mt-0.5">
                        支付 {formatDt(o.paidAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDt(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-sm">暂无符合条件的订单</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
