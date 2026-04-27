import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAttributionOnce } from "@/lib/attribution";
import { initPostHog } from "@/lib/analytics/posthog";

initPostHog();

createRoot(document.getElementById("root")!).render(<App />);

// Fire-and-forget: capture first-visit attribution
setTimeout(() => { captureAttributionOnce().catch(() => {}); }, 0);
