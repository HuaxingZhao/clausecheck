import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getFeedbackBadCases,
  getFeedbackDailyTrend,
  getFeedbackOverview,
  listFeedback,
} from "@/lib/db/feedback-queries";
import type { FeedbackType } from "@/lib/feedback/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const format = url.searchParams.get("format"); // csv | json | (default dashboard json)
  const sinceDays = Math.min(
    365,
    Math.max(1, Number(url.searchParams.get("sinceDays") || "30") || 30)
  );
  const jurisdiction = url.searchParams.get("jurisdiction") || undefined;
  const feedbackTypeParam = url.searchParams.get("feedbackType");
  const feedbackTypes = feedbackTypeParam
    ? (feedbackTypeParam.split(",").filter(Boolean) as FeedbackType[])
    : undefined;

  try {
    if (format === "csv" || format === "json") {
      const rows = await listFeedback({
        sinceDays,
        jurisdiction,
        feedbackTypes,
      });

      if (format === "json") {
        return NextResponse.json({
          exportedAt: new Date().toISOString(),
          count: rows.length,
          rows,
        });
      }

      const header = [
        "id",
        "createdAt",
        "feedbackType",
        "jurisdiction",
        "targetType",
        "targetId",
        "promptVersion",
        "contractHash",
        "comment",
        "packId",
        "degraded",
      ];
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines = [
        header.join(","),
        ...rows.map((r) =>
          [
            r.id,
            r.createdAt,
            r.feedbackType,
            r.jurisdiction,
            r.targetType,
            r.targetId,
            r.promptVersion,
            r.contractHash,
            r.comment || "",
            r.ragMetadata.packId,
            String(r.ragMetadata.degraded),
          ]
            .map((c) => escape(String(c)))
            .join(",")
        ),
      ];
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="feedback-export-${sinceDays}d.csv"`,
        },
      });
    }

    const [overview, daily, badCases] = await Promise.all([
      getFeedbackOverview(sinceDays),
      getFeedbackDailyTrend(sinceDays),
      getFeedbackBadCases(Math.max(sinceDays, 90)),
    ]);

    return NextResponse.json({
      sinceDays,
      overview,
      daily,
      badCases,
    });
  } catch (err: unknown) {
    console.error("admin feedback dashboard error:", err);
    return NextResponse.json(
      { error: "Failed to load feedback analytics" },
      { status: 500 }
    );
  }
}
