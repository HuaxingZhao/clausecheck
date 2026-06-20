import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 生产环境采样 10%，避免配额消耗过快
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay 采样
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 屏蔽不含报错的 session replay
  beforeSend(event) {
    if (event.exception) {
      Sentry.getCurrentScope().setTag("environment", process.env.NODE_ENV || "development");
    }
    return event;
  },
});
