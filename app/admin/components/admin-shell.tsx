"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard", label: "数据看板" },
  { href: "/admin/feedback-dashboard", label: "反馈分析" },
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/orders", label: "订单管理" },
];

export default function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">ClauseCheck Ops</p>
            <h1 className="text-lg font-semibold">运营管理后台</h1>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-300">{adminEmail}</p>
            <Link href="/" className="text-slate-400 hover:text-white text-xs">
              返回主站
            </Link>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pb-0">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
