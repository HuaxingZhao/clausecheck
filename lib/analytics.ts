/**
 * Lightweight product analytics — fire-and-forget to /api/events.
 * Not a substitute for a full analytics stack; enough for conversion funnel debugging.
 */

export type AnalyticsEvent =
  | "scan_started"
  | "scan_completed"
  | "scan_refine_completed"
  | "scan_quota_blocked"
  | "checkout_started"
  | "checkout_completed"
  | "report_pdf_download"
  | "review_opened"
  | "review_export_email"
  | "review_export_workbook"
  | "review_started"
  | "review_completed"
  | "payment_success"
  | "export_failed"
  | "invite_redeemed"
  | "sample_contract_loaded";

export function trackEvent(
  name: AnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window === "undefined") return;
  const payload = {
    name,
    props: props ?? {},
    path: window.location.pathname,
    ts: new Date().toISOString(),
  };
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
      return;
    }
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* non-blocking */
  }
}
