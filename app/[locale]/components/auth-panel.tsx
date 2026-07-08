"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  getOrCreateDeviceFingerprint,
  readPendingInviteCode,
  clearPendingInviteCode,
} from "@/lib/invite/client-fingerprint";

type AuthMode = "login" | "register";

interface AuthPanelProps {
  open: boolean;
  onClose: () => void;
  locale: string;
  initialEmail?: string;
  onSuccess?: () => void;
}

export default function AuthPanel({
  open,
  onClose,
  locale,
  initialEmail = "",
  onSuccess,
}: AuthPanelProps) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setMode("login");
    }
  }, [open, initialEmail]);

  if (!open) return null;

  function startGoogleOAuth() {
    window.location.href = `/api/auth/google?locale=${locale}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password, locale }
          : {
              email,
              password,
              confirmPassword,
              locale,
              inviteCode: readPendingInviteCode() ?? undefined,
              deviceFingerprint: getOrCreateDeviceFingerprint(),
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Server already attempted invite redeem; clear pending code either way.
      if (mode === "register") {
        clearPendingInviteCode();
      }

      onSuccess?.();
      window.location.href = `/${locale}/account?auth=success`;
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
        <p className="text-sm text-ink-light mb-5">{t("subtitleShort")}</p>

        <div className="auth-social-stack">
          <button
            type="button"
            className="auth-oauth-btn auth-oauth-google"
            onClick={startGoogleOAuth}
          >
            <GoogleIcon />
            {t("continueGoogle")}
          </button>
          <div className="auth-divider">
            <span>{t("orDivider")}</span>
          </div>
        </div>

        <div className="auth-mode-tabs mb-4">
          <button
            type="button"
            className={`auth-mode-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            {t("tabLogin")}
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            {t("tabRegister")}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-sans font-medium mb-2">{t("emailLabel")}</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="auth-input"
          />

          <label className="block text-sm font-sans font-medium mb-2 mt-4">{t("passwordLabel")}</label>
          <input
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="auth-input"
          />

          {mode === "register" && (
            <>
              <label className="block text-sm font-sans font-medium mb-2 mt-4">
                {t("confirmPasswordLabel")}
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
                className="auth-input"
              />
            </>
          )}

          {error && <p className="text-red-600 text-sm mt-3 font-sans">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
            {loading
              ? t("submitting")
              : mode === "login"
                ? t("loginButton")
                : t("registerButton")}
          </button>

          <p className="text-xs text-ink-muted mt-3 text-center font-sans">
            {mode === "login" ? t("loginHint") : t("registerHint")}
          </p>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
