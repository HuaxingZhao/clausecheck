"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

interface BetaSubscribeFormProps {
  variant?: "hero" | "footer";
}

export default function BetaSubscribeForm({
  variant = "hero",
}: BetaSubscribeFormProps) {
  const t = useTranslations("beta");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/beta/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          locale: locale === "zh" ? "zh" : "en",
          source: `beta_page_${variant}`,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        alreadySubscribed?: boolean;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || t("form.error"));
      }
      setStatus("ok");
      setMessage(
        body.alreadySubscribed ? t("form.already") : t("form.success")
      );
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t("form.error"));
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={`beta-subscribe beta-subscribe--${variant}`}
    >
      <div className="beta-subscribe-row">
        <label className="sr-only" htmlFor={`beta-email-${variant}`}>
          {t("form.emailLabel")}
        </label>
        <input
          id={`beta-email-${variant}`}
          type="email"
          required
          autoComplete="email"
          className="beta-subscribe-input"
          placeholder={t("form.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className="btn btn-primary beta-subscribe-btn"
          disabled={status === "loading"}
        >
          {status === "loading" ? t("form.submitting") : t("form.submit")}
        </button>
      </div>
      {message && (
        <p
          className={`beta-subscribe-msg ${status === "error" ? "is-error" : "is-ok"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
