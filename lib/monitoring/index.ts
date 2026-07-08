import * as Sentry from "@sentry/nextjs";
import {
  monitoringEnabled,
  type BusinessEventPayload,
  type MonitoringContext,
} from "./config";

function applyContext(scope: Sentry.Scope, ctx?: MonitoringContext): void {
  if (!ctx) return;
  const tags: Record<string, string> = {};
  if (ctx.user_id) tags.user_id = String(ctx.user_id);
  if (ctx.plan_type) tags.plan_type = String(ctx.plan_type);
  if (ctx.document_word_count != null) tags.document_word_count = String(ctx.document_word_count);
  if (ctx.route) tags.route = String(ctx.route);
  scope.setTags(tags);

  const { user_id, plan_type, document_word_count, route, ...extra } = ctx;
  scope.setContext("monitoring", {
    user_id,
    plan_type,
    document_word_count,
    route,
    ...extra,
  });
}

export function captureMonitoringException(
  err: unknown,
  ctx?: MonitoringContext
): void {
  if (!monitoringEnabled()) return;
  Sentry.withScope((scope) => {
    applyContext(scope, ctx);
    Sentry.captureException(err);
  });
}

export function captureMonitoringMessage(
  message: string,
  level: Sentry.SeverityLevel,
  ctx?: MonitoringContext
): void {
  if (!monitoringEnabled()) return;
  Sentry.withScope((scope) => {
    applyContext(scope, ctx);
    Sentry.captureMessage(message, level);
  });
}

export async function trackBusinessEvent(payload: BusinessEventPayload): Promise<void> {
  if (!monitoringEnabled()) return;

  const { event, ...metrics } = payload;

  Sentry.withScope((scope) => {
    applyContext(scope, metrics);
    scope.setTag("business_event", event);
    Sentry.captureEvent({
      message: event,
      level: event === "export_failed" ? "warning" : "info",
      tags: {
        business_event: event,
        user_id: metrics.user_id ? String(metrics.user_id) : undefined,
        plan_type: metrics.plan_type ? String(metrics.plan_type) : undefined,
      },
      extra: metrics,
    });
  });

  try {
    const { recordAnalyticsEvent } = await import("@/lib/db/analytics-store");
    await recordAnalyticsEvent({
      name: event,
      props: metrics as Record<string, unknown>,
      path: metrics.route ? String(metrics.route) : null,
      ts: new Date().toISOString(),
    });
  } catch {
    /* non-blocking */
  }
}

export function reportApi5xx(
  route: string,
  err: unknown,
  ctx?: MonitoringContext
): void {
  captureMonitoringException(err, { ...ctx, route });
}

export function reportExportFailure(
  err: unknown,
  ctx?: MonitoringContext
): void {
  captureMonitoringException(err, { ...ctx, route: ctx?.route ?? "/api/review/export" });
  void trackBusinessEvent({
    event: "export_failed",
    route: ctx?.route ?? "/api/review/export",
    ...ctx,
  });
}

export { initSentry } from "./init";
export {
  monitoringEnabled,
  getSentryDsn,
  estimateDocumentTokens,
  type MonitoringContext,
  type BusinessEventName,
  type BusinessEventPayload,
} from "./config";
