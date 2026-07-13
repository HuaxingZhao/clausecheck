"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { readJsonSafe } from "@/lib/upload-safe";

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailValue = String(fd.get("email") || email || "")
      .trim()
      .toLowerCase();
    if (!emailValue || !emailValue.includes("@")) {
      setStatus("error");
      setMessage(t("form.invalidEmail"));
      return;
    }

    setStatus("loading");
    setMessage(null);
    setEmail(emailValue);
    try {
      const res = await fetch("/api/beta/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: emailValue,
          locale: locale === "zh" ? "zh" : "en",
          source: `beta_page_${variant}`,
        }),
      });
      const body = (await readJsonSafe<{
        ok?: boolean;
        alreadySubscribed?: boolean;
        message?: string;
        error?: string;
      }>(res)) as {
        ok?: boolean;
        alreadySubscribed?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || body.ok === false) {
        throw new Error(body.message || t("form.error"));
      }
      setStatus("ok");
      setMessage(
        body.alreadySubscribed ? t("form.already") : t("form.success")
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t("form.error"));
    }
  }

  if (status === "ok") {
    return (
      <div
        className={`beta-subscribe beta-subscribe--${variant} beta-subscribe-done`}
        role="status"
        aria-live="polite"
      >
        <p className="beta-subscribe-banner is-ok">{message}</p>
        <p className="beta-subscribe-note">{t("subscribe.success.note")}</p>
        <div className="beta-subscribe-actions">
          <Link
            href={`/${locale}/account`}
            className="btn btn-primary beta-subscribe-btn"
          >
            {t("subscribe.success.ctaPrimary")}
          </Link>
          <button
            type="button"
            className="beta-subscribe-secondary"
            onClick={() => {
              setStatus("idle");
              setMessage(null);
              setEmail("");
            }}
          >
            {t("subscribe.success.ctaSecondary")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={`beta-subscribe beta-subscribe--${variant}`}
      noValidate
    >
      <div className="beta-subscribe-row">
        <label className="sr-only" htmlFor={`beta-email-${variant}`}>
          {t("form.emailLabel")}
        </label>
        <input
          id={`beta-email-${variant}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="beta-subscribe-input"
          placeholder={t("form.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
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
      {message ? (
        <p
          className={`beta-subscribe-msg ${status === "error" ? "is-error" : "is-ok"}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
