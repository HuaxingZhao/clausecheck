import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendResendEmail } from "@/lib/email/resend";

const salesSchema = z.object({
  company: z.string().min(1).max(200),
  email: z.string().email().max(200),
  teamSize: z.string().min(1).max(80),
  message: z.string().min(10).max(4000),
  /** Legacy field — optional for backward compatibility */
  name: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = salesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { company, email, teamSize, message, name } = parsed.data;
    const contactName = name?.trim() || company;
    const to = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();

    if (to) {
      try {
        const sent = await sendResendEmail({
          to,
          purpose: "enterprise-sales-lead",
          replyTo: email,
          subject: `[ClauseCheck Enterprise] ${company} — ${contactName}`,
          text: `Company: ${company}\nEmail: ${email}\nTeam size: ${teamSize}\n\n${message}`,
          softFailUnreliableFrom: true,
        });
        if (!sent.delivered) {
          console.info("Enterprise sales lead (email not configured):", {
            company,
            email,
            teamSize,
            message: message.slice(0, 200),
          });
        }
      } catch (err) {
        console.error("Resend sales lead error:", err);
        return NextResponse.json({ error: "Email delivery failed" }, { status: 502 });
      }
    } else {
      console.info("Enterprise sales lead (email not configured):", {
        company,
        email,
        teamSize,
        message: message.slice(0, 200),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("contact sales error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
