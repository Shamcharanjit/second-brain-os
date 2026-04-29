import posthog from "posthog-js";

// PostHog publishable key — safe to embed in client bundle (write-only, designed for browser use).
// Env var takes precedence; defaults are the InsightHalo production project.
const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ??
  "phc_qZPincdx7oZDe6kWSxWXAczVPVMfT2DCjMgHNpKaGSzU";
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.info("[posthog] VITE_POSTHOG_KEY not set — analytics disabled.");
    }
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    autocapture: false,
    disable_session_recording: false,
    // Disable feature-flags polling — we don't use flags and the /flags endpoint
    // returns 401 noise in the console when the project isn't configured for it.
    advanced_disable_feature_flags: true,
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug(false);
    },
  });

  initialized = true;
}

export function phCapture(
  event: string,
  properties: Record<string, unknown> = {},
) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function phIdentify(
  userId: string,
  traits: Record<string, unknown> = {},
) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function phReset() {
  if (!initialized) return;
  posthog.reset();
}

export function phPageview(path: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: path });
}
