export async function sendMagicLinkEmail(email: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ClauseCheck <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("\n--- Magic link (dev — set RESEND_API_KEY to send email) ---");
    console.log(`To: ${email}`);
    console.log(`Link: ${link}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Sign in to ClauseCheck",
      html: `
        <p>Click the link below to sign in to ClauseCheck and access your Pro reports:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
}
