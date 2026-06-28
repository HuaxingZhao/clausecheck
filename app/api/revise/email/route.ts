import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import {
  generateSuggestionsDocx,
  generateSuggestionsPdf,
} from "@/lib/contract-export";
import { sendSuggestionsEmail } from "@/lib/email/revised-contract";
import type { ContractChange } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { email, changes = [], locale: rawLocale } = await req.json();
    const locale = rawLocale === "en" ? "en" : "zh";

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: locale === "en" ? "Valid email required" : "请输入有效邮箱" },
        { status: 400 }
      );
    }

    const changeList = Array.isArray(changes) ? (changes as ContractChange[]) : [];
    if (!changeList.length) {
      return NextResponse.json(
        { error: locale === "en" ? "No suggestions to send." : "没有可发送的建议。" },
        { status: 400 }
      );
    }

    const session = await getSessionFromRequest(req);
    const tier = await resolveTierForRequest(
      session?.sub ?? null,
      req.headers.get("x-user-tier")
    );
    const isPro = tier === "pro" || tier === "pay_per_use";
    if (!isPro) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Email delivery is a Pro feature."
              : "邮件发送为专业版功能。",
          code: "PRO_REQUIRED",
        },
        { status: 403 }
      );
    }

    const [pdfBytes, docxBytes] = await Promise.all([
      generateSuggestionsPdf(changeList, locale),
      generateSuggestionsDocx(changeList, locale),
    ]);

    const { delivered } = await sendSuggestionsEmail({
      to: email.trim().toLowerCase(),
      locale,
      pdfBytes,
      docxBytes,
    });

    return NextResponse.json({
      ok: true,
      delivered,
      ...(delivered
        ? {}
        : {
            message:
              locale === "zh"
                ? "邮件未发出 — 服务器未配置 RESEND_API_KEY。"
                : "Email not sent — RESEND_API_KEY is not configured on the server.",
          }),
    });
  } catch (err: unknown) {
    console.error("suggestions email error:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
