/**
 * Error monitoring — powered by PostHog (already installed, free forever).
 *
 * PostHog's captureException() sends errors to the same project as your
 * analytics events, so you see errors + user journeys in one place.
 *
 * No DSN, no new account, no billing — PostHog free tier covers this.
 */

import posthog from "posthog-js";

// ── Global unhandled error capture ──────────────────────────────────────────

export function initErrorMonitoring() {
  if (typeof window === "undefined") return;

  // Unhandled JS exceptions
  window.addEventListener("error", (event) => {
    if (shouldIgnore(event.message)) return;
    captureError(event.error ?? new Error(event.message), {
      source: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const err = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    if (shouldIgnore(err.message)) return;
    captureError(err, { type: "unhandledrejection" });
  });
}

// ── User context ─────────────────────────────────────────────────────────────

/** Call this whenever auth state changes so errors are linked to users. */
export function setSentryUser(userId: string | null) {
  // PostHog identify is already handled in AuthContext via phIdentify —
  // this is a no-op kept for API compatibility with any future swap.
  void userId;
}

// ── Manual capture ───────────────────────────────────────────────────────────

/** Capture an exception manually with optional extra context. */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error("[monitoring]", err, context);
    return;
  }
  try {
    const exception = err instanceof Error ? err : new Error(String(err));
    // PostHog captureException attaches stack trace + current person automatically
    posthog.captureException(exception, context ? { extra: context } : undefined);
  } catch {
    // Never let monitoring crash the app
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const IGNORED_PATTERNS = [
  "ResizeObserver loop",
  "Non-Error promise rejection",
  "Failed to fetch",
  "Load failed",
  "NetworkError",
  "ChunkLoadError",
  "Loading chunk",
];

function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some((p) => message?.includes(p));
}
