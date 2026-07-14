"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, localizedPath } from "@/i18n/routing";
import {
  getOrCreateDeviceFingerprint,
  readPendingInviteCode,
  clearPendingInviteCode,
} from "@/lib/invite/client-fingerprint";
import { PHONE_COUNTRY_OPTIONS } from "@/lib/auth/phone";
import type { CountryCode } from "libphonenumber-js";

type AuthChannel = "phone" | "email";
type AuthMode = "login" | "register" | "forgot";
type PhoneStep = "enter" | "otp";

interface AuthPanelProps {
  open: boolean;
  onClose: () => void;
  locale: string;
  initialEmail?: string;
  /** Default channel when the panel opens. */
  initialChannel?: AuthChannel;
  /** Default mode when the panel opens (e.g. forgot from /forgot-password). */
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export default function AuthPanel({
  open,
  onClose,
  locale,
  initialEmail = "",
  initialChannel = "phone",
  initialMode = "login",
  onSuccess,
}: AuthPanelProps) {
  const t = useTranslations("auth");
  const [channel, setChannel] = useState<AuthChannel>(initialChannel);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState<CountryCode>("CN");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");
  const [sentPhone, setSentPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setPassword("");
      setConfirmPassword("");
      setPhone("");
      setOtp("");
      setPhoneStep("enter");
      setSentPhone(null);
      setError(null);
      setInfo(null);
      const nextMode = initialMode;
      setMode(nextMode);
      // Forgot password is email-only — force email channel
      setChannel(nextMode === "forgot" ? "email" : initialChannel);
    }
  }, [open, initialEmail, initialChannel, initialMode]);

  if (!open) return null;

  function startGoogleOAuth() {
    window.location.href = `/api/auth/google?locale=${locale}`;
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("forgotFailed"));
      setInfo(typeof data.message === "string" ? data.message : t("forgotSent"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("forgotFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
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

      if (mode === "register") {
        clearPendingInviteCode();
      }

      onSuccess?.();
      window.location.href = localizedPath("/account?auth=success", locale);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, country, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("phoneSendFailed"));
      setSentPhone(typeof data.phone === "string" ? data.phone : phone);
      setPhoneStep("otp");
      setInfo(typeof data.message === "string" ? data.message : t("phoneCodeSent"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("phoneSendFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: sentPhone || phone,
          country,
          token: otp,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("phoneVerifyFailed"));
      onSuccess?.();
      window.location.href = localizedPath("/account?auth=success", locale);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("phoneVerifyFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label={t("close")}>
          ×
        </button>
        <h2 className="font-sans text-xl font-semibold mb-2">
          {mode === "forgot" ? t("forgotPageTitle") : t("title")}
        </h2>
        <p className="text-sm text-ink-light mb-5">
          {mode === "forgot" ? t("forgotPageSubtitle") : t("subtitleShort")}
        </p>

        {mode !== "forgot" && (
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
        )}

        {mode !== "forgot" && (
          <div className="auth-mode-tabs mb-4">
            <button
              type="button"
              className={`auth-mode-tab ${channel === "phone" ? "active" : ""}`}
              onClick={() => {
                setChannel("phone");
                setMode("login");
                setError(null);
                setInfo(null);
              }}
            >
              {t("tabPhone")}
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${channel === "email" ? "active" : ""}`}
              onClick={() => {
                setChannel("email");
                setError(null);
                setInfo(null);
              }}
            >
              {t("tabEmail")}
            </button>
          </div>
        )}

        {channel === "phone" && mode !== "forgot" ? (
          phoneStep === "enter" ? (
            <form onSubmit={handleSendCode}>
              <label className="block text-sm font-sans font-medium mb-2">{t("phoneLabel")}</label>
              <div className="flex gap-2">
                <select
                  className="auth-input !w-auto min-w-[7.5rem]"
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  aria-label={t("countryLabel")}
                >
                  {PHONE_COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.dial} {locale === "en" ? c.labelEn : c.labelZh}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className="auth-input flex-1"
                />
              </div>
              <p className="text-xs text-ink-muted mt-2 font-sans">{t("phoneHint")}</p>
              {error && <p className="text-red-600 text-sm mt-3 font-sans">{error}</p>}
              {info && <p className="text-legal-navy text-sm mt-3 font-sans">{info}</p>}
              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
                {loading ? t("submitting") : t("sendCode")}
              </button>
              <button
                type="button"
                className="w-full mt-3 text-sm font-sans text-legal-navy hover:underline"
                onClick={() => {
                  setChannel("email");
                  setMode("forgot");
                  setError(null);
                  setInfo(null);
                }}
              >
                {t("forgotPasswordEmailLink")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <p className="text-sm text-ink-light mb-3 font-sans">
                {t("otpSentTo", { phone: sentPhone || phone })}
              </p>
              <label className="block text-sm font-sans font-medium mb-2">{t("otpLabel")}</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="[0-9]{4,8}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder={t("otpPlaceholder")}
                className="auth-input tracking-widest text-center text-lg"
              />
              {error && <p className="text-red-600 text-sm mt-3 font-sans">{error}</p>}
              {info && <p className="text-legal-navy text-sm mt-3 font-sans">{info}</p>}
              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
                {loading ? t("submitting") : t("verifyCode")}
              </button>
              <button
                type="button"
                className="w-full mt-3 text-sm text-ink-muted hover:text-ink font-sans"
                onClick={() => {
                  setPhoneStep("enter");
                  setOtp("");
                  setError(null);
                }}
              >
                {t("changePhone")}
              </button>
            </form>
          )
        ) : (
          <>
            {mode !== "forgot" && (
              <div className="auth-mode-tabs mb-4">
                <button
                  type="button"
                  className={`auth-mode-tab ${mode === "login" ? "active" : ""}`}
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setInfo(null);
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
                    setInfo(null);
                  }}
                >
                  {t("tabRegister")}
                </button>
              </div>
            )}

            {mode === "forgot" ? (
              <form onSubmit={handleForgotSubmit}>
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
                {error && <p className="text-red-600 text-sm mt-3 font-sans">{error}</p>}
                {info && (
                  <div className="mt-3 space-y-1">
                    <p className="text-green-700 text-sm font-sans">{info}</p>
                    <p className="text-ink-muted text-xs font-sans leading-relaxed">
                      {t("forgotSentHint")}
                    </p>
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
                  {loading ? t("submitting") : t("forgotButton")}
                </button>
                <button
                  type="button"
                  className="w-full mt-3 text-sm font-sans text-ink-muted hover:text-ink"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  {t("backToLogin")}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailSubmit}>
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

                <div className="flex items-center justify-between gap-3 mt-4 mb-2">
                  <label className="block text-sm font-sans font-medium">{t("passwordLabel")}</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-sm font-sans text-legal-navy hover:underline shrink-0"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                        setInfo(null);
                        setPassword("");
                      }}
                    >
                      {t("forgotPassword")}
                    </button>
                  )}
                </div>
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
            )}
          </>
        )}

        <p className="text-xs text-ink-muted mt-6 text-center font-sans leading-relaxed">
          {t.rich("legalFooter", {
            terms: (chunks) => (
              <Link href="/terms" className="underline hover:text-ink">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="underline hover:text-ink">
                {chunks}
              </Link>
            ),
          })}
        </p>
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
