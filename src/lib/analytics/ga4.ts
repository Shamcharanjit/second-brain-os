/**
 * GA4 SPA pageview tracker.
 * The base gtag.js snippet lives in index.html. This module reports
 * client-side route changes to GA4 as `page_view` events.
 */

export const GA4_MEASUREMENT_ID = "G-F658ZZG25F";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackPageview(path: string, title?: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
    send_to: GA4_MEASUREMENT_ID,
  });
}

/**
 * Fire a custom GA4 product event. Safe no-op if gtag.js hasn't loaded
 * (e.g. blocked by an ad blocker or running in SSR/tests).
 */
export type GA4EventName =
  | "capture_created"
  | "memory_saved"
  | "project_created"
  | "signup_completed"
  | "waitlist_joined"
  | "upgrade_clicked";

export function trackEvent(
  name: GA4EventName,
  params: Record<string, unknown> = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, {
    ...params,
    send_to: GA4_MEASUREMENT_ID,
  });
}
