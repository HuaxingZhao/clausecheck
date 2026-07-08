"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  balance: number;
  totalSpentCents: number;
  lastActiveAt: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  referenceId: string | null;
  createdAt: string;
}

function formatCny(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function formatDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const [txUser, setTxUser] = useState<AdminUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function openTransactions(user: AdminUser) {
    setTxUser(user);
    setTxLoading(true);
    setTransactions([]);
    try {
      const res = await fetch(`/api/admin/users?user_id=${encodeURIComponent(user.id)}`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { transactions: Transaction[] };
      setTransactions(data.transactions);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustUser) return;
    const delta = Number.parseInt(adjustDelta, 10);
    if (!Number.isFinite(delta) || delta === 0) return;

    setAdjustSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: adjustUser.id,
          delta,
          reason: adjustReason.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setAdjustUser(null);
      setAdjustDelta("");
      setAdjustReason("");
      await loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Adjust failed");
    } finally {
      setAdjustSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">用户管理</h2>
        <p className="text-sm text-slate-500">最近 500 位用户 · 支持手动调额与流水查询</p>
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
                <th className="text-left px-4 py-3 font-medium">邮箱</th>
                <th className="text-left px-4 py-3 font-medium">注册时间</th>
                <th className="text-right px-4 py-3 font-medium">剩余额度</th>
                <th className="text-right px-4 py-3 font-medium">累计消费</th>
                <th className="text-left px-4 py-3 font-medium">最近活跃</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDt(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-medium">{u.balance}</td>
                  <td className="px-4 py-3 text-right">{formatCny(u.totalSpentCents)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDt(u.lastActiveAt)}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-blue-700 hover:underline"
                      onClick={() => {
                        setAdjustUser(u);
                        setAdjustDelta("");
                        setAdjustReason("");
                      }}
                    >
                      调整额度
                    </button>
                    <button
                      type="button"
                      className="text-slate-700 hover:underline"
                      onClick={() => void openTransactions(u)}
                    >
                      流水
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={submitAdjust}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="font-semibold text-lg">调整额度</h3>
            <p className="text-sm text-slate-600">{adjustUser.email}</p>
            <label className="block text-sm">
              <span className="text-slate-600">变动数量（正数增加，负数扣减）</span>
              <input
                type="number"
                required
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="例如 5 或 -2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">原因（记入流水 reference）</span>
              <input
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="客服补偿 / 活动赠送"
              />
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-lg border border-slate-300"
                onClick={() => setAdjustUser(null)}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={adjustSubmitting}
                className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white disabled:opacity-50"
              >
                {adjustSubmitting ? "提交中…" : "确认调整"}
              </button>
            </div>
          </form>
        </div>
      )}

      {txUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">额度流水</h3>
                <p className="text-sm text-slate-500">{txUser.email}</p>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setTxUser(null)}
              >
                关闭
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {txLoading && <p className="text-slate-500 text-sm">加载中…</p>}
              {!txLoading && transactions.length === 0 && (
                <p className="text-slate-500 text-sm">暂无流水记录</p>
              )}
              {!txLoading && transactions.length > 0 && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-left">
                      <th className="py-2 pr-4">时间</th>
                      <th className="py-2 pr-4">类型</th>
                      <th className="py-2 pr-4 text-right">数量</th>
                      <th className="py-2">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-slate-100">
                        <td className="py-2 pr-4 text-slate-600">{formatDt(tx.createdAt)}</td>
                        <td className="py-2 pr-4">{tx.type}</td>
                        <td
                          className={`py-2 pr-4 text-right font-medium ${
                            tx.amount >= 0 ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="py-2 text-slate-600 truncate max-w-[200px]">
                          {tx.referenceId ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
