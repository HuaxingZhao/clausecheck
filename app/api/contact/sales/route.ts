import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const salesSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  company: z.string().min(1).max(200),
  message: z.string().min(10).max(4000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = salesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, email, company, message } = parsed.data;
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    const to = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();

    if (apiKey && from && to) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email,
          subject: `[ClauseCheck Enterprise] ${company} — ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\n${message}`,
        }),
      });
      if (!res.ok) {
        console.error("Resend sales lead error:", await res.text());
        return NextResponse.json({ error: "Email delivery failed" }, { status: 502 });
      }
    } else {
      console.info("Enterprise sales lead (email not configured):", {
        name,
        email,
        company,
        message: message.slice(0, 200),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("contact sales error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
