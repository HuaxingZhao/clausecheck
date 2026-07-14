import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subscribeBetaEmail } from "@/lib/db/beta-waitlist-store";
import { sendResendEmail } from "@/lib/email/resend";

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
        {
          ok: false,
          error: "INVALID_EMAIL",
          message: "Enter a valid email address",
        },
        { status: 400 }
      );
    }

    const result = await subscribeBetaEmail(
      parsed.data.email,
      parsed.data.locale ?? "en",
      parsed.data.source ?? "beta_page"
    );

    const to = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
    if (to && result.created) {
      void sendResendEmail({
        to,
        purpose: "beta-subscribe-notify",
        subject: `[ClauseCheck Beta] ${result.email}`,
        text: `New beta signup: ${result.email}\nlocale=${parsed.data.locale ?? "en"}\nsource=${parsed.data.source ?? "beta_page"}`,
        softFailUnreliableFrom: true,
      }).catch((err) => console.error("beta notify email failed:", err));
    }

    return NextResponse.json({
      ok: true,
      alreadySubscribed: !result.created,
      message: result.created ? "subscribed" : "already",
    });
  } catch (err: unknown) {
    console.error("beta subscribe error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    const needsMigration =
      /beta_waitlist/i.test(detail) || /does not exist/i.test(detail);
    return NextResponse.json(
      {
        ok: false,
        error: needsMigration ? "MIGRATION_REQUIRED" : "SUBSCRIBE_FAILED",
        message: needsMigration
          ? "Waitlist table missing — run beta_waitlist migration"
          : "Could not save signup",
      },
      { status: 500 }
    );
  }
}
