import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subscribeBetaEmail } from "@/lib/db/beta-waitlist-store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email().max(200),
  locale: z.enum(["en", "zh"]).optional(),
  source: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_EMAIL", message: "Enter a valid email address" },
        { status: 400 }
      );
    }

    const result = await subscribeBetaEmail(
      parsed.data.email,
      parsed.data.locale ?? "en",
      parsed.data.source ?? "beta_page"
    );

    // Optional notify admins via Resend (non-blocking failure)
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    const to = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
    if (apiKey && from && to && result.created) {
      void fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `[ClauseCheck Beta] ${result.email}`,
          text: `New beta signup: ${result.email}\nlocale=${parsed.data.locale ?? "en"}\nsource=${parsed.data.source ?? "beta_page"}`,
        }),
      }).catch((err) => console.error("beta notify email failed:", err));
    }

    return NextResponse.json({
      ok: true,
      alreadySubscribed: !result.created,
    });
  } catch (err: unknown) {
    console.error("beta subscribe error:", err);
    return NextResponse.json(
      { error: "SUBSCRIBE_FAILED", message: "Could not save signup" },
      { status: 500 }
    );
  }
}
