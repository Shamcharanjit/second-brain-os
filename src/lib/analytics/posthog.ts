import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
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
