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
