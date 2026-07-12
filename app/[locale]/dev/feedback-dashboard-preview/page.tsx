/**
 * Dev-only preview of feedback dashboard (no admin cookie required).
 */

import { notFound } from "next/navigation";
import FeedbackDashboardClient from "@/app/admin/feedback-dashboard/feedback-dashboard-client";
import {
  getFeedbackBadCases,
  getFeedbackDailyTrend,
  getFeedbackOverview,
} from "@/lib/db/feedback-queries";

export const dynamic = "force-dynamic";

export default async function FeedbackDashboardPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const sinceDays = 30;
  const opts = { preferLocalJson: true };
  const [overview, daily, badCases] = await Promise.all([
    getFeedbackOverview(sinceDays, opts),
    getFeedbackDailyTrend(sinceDays, opts),
    getFeedbackBadCases(90, opts),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Dev preview — production access is /admin/feedback-dashboard (admin only).
        </p>
        <FeedbackDashboardClient
          initialData={{ sinceDays, overview, daily, badCases }}
        />
      </div>
    </div>
  );
}
