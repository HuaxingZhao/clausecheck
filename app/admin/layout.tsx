import { redirect } from "next/navigation";
import { requireAdminFromCookies } from "@/lib/admin/auth";
import AdminShell from "./components/admin-shell";
import "../[locale]/globals.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminFromCookies();
  if (!admin) {
    redirect("/?admin=forbidden");
  }

  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
