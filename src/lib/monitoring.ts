/**
 * Sentry error monitoring — initialised once in main.tsx.
 * DSN is public and safe to include in client bundles.
 */
import * as Sentry from "@sentry/react";

export function initSentry() {
  // Only run in production — avoids noisy local errors
  if (import.meta.env.DEV) return;

  Sentry.init({
    dsn: "https://b4a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5@o0.ingest.sentry.io/0",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,   // protect PII in session replays
        blockAllMedia: false,
      }),
    ],
    // Performance: capture 5 % of transactions in prod
    tracesSampleRate: 0.05,
    // Session replay: 2 % of sessions, 100 % of sessions with errors
    replaysSessionSampleRate: 0.02,
    replaysOnErrorSampleRate: 1.0,
    environment: "production",
    release: "insighthalo@" + (import.meta.env.VITE_APP_VERSION ?? "latest"),
    // Ignore expected / uninteresting errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "ChunkLoadError",
    ],
    beforeSend(event) {
      // Strip user email from breadcrumbs / request data
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/email=[^&]+/, "email=REDACTED");
      }
      return event;
    },
  });
}

/** Set the authenticated user context on Sentry events. */
export function setSentryUser(userId: string | null) {
  if (import.meta.env.DEV) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/** Manually capture an exception with optional extra context. */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error("[Sentry capture]", err, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
