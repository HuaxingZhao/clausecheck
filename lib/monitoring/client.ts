"use client";

import * as Sentry from "@sentry/nextjs";

const enabled =
  process.env.NEXT_PUBLIC_MONITORING_ENABLED === "true" &&
  !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export function captureClientBusinessEvent(
  event: "export_failed" | "review_started" | "review_completed",
  props: Record<string, string | number | boolean | null | undefined>
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag("business_event", event);
    for (const [k, v] of Object.entries(props)) {
      if (v != null) scope.setTag(k, String(v));
    }
    Sentry.captureEvent({
      message: event,
      level: event === "export_failed" ? "warning" : "info",
      extra: props,
    });
  });
}

export function captureClientException(
  err: unknown,
  props?: Record<string, string | number | null | undefined>
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v != null) scope.setTag(k, String(v));
      }
    }
    Sentry.captureException(err);
  });
}
