/** Monitoring & error tracking configuration (Sentry / GlitchTip-compatible). */

export function monitoringEnabled(): boolean {
  const flag = process.env.MONITORING_ENABLED;
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return !!process.env.SENTRY_DSN;
  // Default: on in production when DSN is set
  return process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN;
}

export function getSentryDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function getSentryEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export function getSentryTracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (raw == null || raw === "") return 0.1;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.1;
}

/** Rough input-token estimate when provider usage is unavailable. */
export function estimateDocumentTokens(charCount: number): number {
  return Math.max(0, Math.ceil(charCount / 4));
}

export interface MonitoringContext {
  user_id?: string | null;
  plan_type?: string | null;
  document_word_count?: number | null;
  file_size_bytes?: number | null;
  duration_ms?: number | null;
  tokens_used?: number | null;
  route?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export type BusinessEventName =
  | "review_started"
  | "review_completed"
  | "payment_success"
  | "export_failed"
  | "invite_redeemed";

export interface BusinessEventPayload extends MonitoringContext {
  event: BusinessEventName;
}
