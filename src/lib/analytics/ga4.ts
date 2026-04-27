/**
 * Unified analytics: fires to GA4 (marketing) and PostHog (product).
 * The base gtag.js snippet lives in index.html. PostHog is initialized
 * from main.tsx via initPostHog().
 */

import { phCapture, phPageview } from "./posthog";

export const GA4_MEASUREMENT_ID = "G-F658ZZG25F";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackPageview(path: string, title?: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: title ?? document.title,
      send_to: GA4_MEASUREMENT_ID,
    });
  }
  phPageview(path);
}

export type GA4EventName =
  | "capture_created"
  | "first_capture"
  | "voice_capture"
  | "memory_saved"
  | "project_created"
  | "signup_completed"
  | "signup"
  | "login"
  | "activation_complete"
  | "waitlist_signup"
  | "waitlist_joined"
  | "upgrade_clicked"
  | "ai_organize_used"
  | "ai_organize_limit_hit"
  | "upgrade_completed"
  | "referral_link_copied"
  | "referral_signup_attributed";

export function trackEvent(
  name: GA4EventName,
  params: Record<string, unknown> = {},
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, {
      ...params,
      send_to: GA4_MEASUREMENT_ID,
    });
  }
  phCapture(name, params);
}
