"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface AuthPanelProps {
  open: boolean;
  onClose: () => void;
  locale: string;
  initialEmail?: string;
}

export default function AuthPanel({ open, onClose, locale, initialEmail = "" }: AuthPanelProps) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setSent(false);
      setError(null);
    }
  }, [open, initialEmail]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="font-sans text-xl font-semibold mb-2">{t("title")}</h2>
        <p className="text-sm text-ink-light mb-6">{t("subtitle")}</p>

        {sent ? (
          <div className="auth-sent">
            <p className="text-sm text-ink font-medium">{t("sentTitle")}</p>
            <p className="text-sm text-ink-light mt-2">{t("sentBody", { email })}</p>
            <button type="button" className="btn btn-primary w-full mt-6" onClick={onClose}>
              {t("close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-sans font-medium mb-2">{t("emailLabel")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="auth-input"
            />
            {error && <p className="text-red-600 text-sm mt-3 font-sans">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-6"
            >
              {loading ? t("sending") : t("sendLink")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
