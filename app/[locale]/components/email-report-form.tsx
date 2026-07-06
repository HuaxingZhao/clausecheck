"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";

interface EmailReportFormProps {
  result: ScanResult;
  locale: string;
}

export default function EmailReportForm({ result, locale }: EmailReportFormProps) {
  const t = useTranslations("emailReport");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devWarning, setDevWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDevWarning(null);
    try {
      const res = await fetch("/api/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, result, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.delivered === false) {
        setDevWarning(data.message || t("notConfigured"));
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        {devWarning ? (
          <p className="text-sm text-amber-800 bg-amber-50/80 rounded-lg p-3 font-sans mb-2">
            {devWarning}
          </p>
        ) : (
          <p className="text-sm text-green-800 bg-green-50/80 rounded-lg p-3 font-sans">
            {t("sent", { email })}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="email-report-form">
      <p className="text-sm text-ink mb-3 font-sans">{t("hint")}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          className="auth-input flex-1"
        />
        <button type="submit" disabled={loading} className="btn btn-outline shrink-0 text-ink">
          {loading ? t("sending") : t("send")}
        </button>
      </div>
      {error && <p className="text-red-600 text-xs mt-2 font-sans">{error}</p>}
    </form>
  );
}
