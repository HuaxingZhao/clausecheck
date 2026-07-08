"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

export default function ContactSalesForm() {
  const t = useTranslations("pricing.enterpriseForm");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setName("");
      setEmail("");
      setCompany("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-green-800 font-sans bg-green-50 border border-green-200 rounded-xl p-4">
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
      <p className="text-sm text-ink-light leading-relaxed">{t("intro")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-ink-muted">{t("name")}</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">{t("email")}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-ink-muted">{t("company")}</span>
        <input
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-ink-muted">{t("message")}</span>
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border/60 px-3 py-2 resize-y"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn btn-primary w-full sm:w-auto"
      >
        {status === "sending" ? t("sending") : t("submit")}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-700">{t("error")}</p>
      )}
    </form>
  );
}
