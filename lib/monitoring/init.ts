import * as Sentry from "@sentry/nextjs";
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryTracesSampleRate,
  monitoringEnabled,
} from "./config";

let initialized = false;

/** Safe for edge + node instrumentation — no Node-only deps. */
export function initSentry(): void {
  if (initialized || !monitoringEnabled()) return;
  const dsn = getSentryDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: getSentryTracesSampleRate(),
    sendDefaultPii: false,
  });
  initialized = true;
}
