import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAttributionOnce } from "@/lib/attribution";
import { initPostHog } from "@/lib/analytics/posthog";
import { initErrorMonitoring } from "@/lib/monitoring";

initPostHog();
initErrorMonitoring(); // must run after PostHog is initialised

createRoot(document.getElementById("root")!).render(<App />);

// Fire-and-forget: capture first-visit attribution
setTimeout(() => { captureAttributionOnce().catch(() => {}); }, 0);

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration is best-effort — failures are non-fatal
    });
  });
}
