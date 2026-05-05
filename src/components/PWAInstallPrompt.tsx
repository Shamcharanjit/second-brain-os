/**
 * PWAInstallPrompt
 *
 * Listens for the browser's `beforeinstallprompt` event and shows a subtle
 * bottom banner inviting mobile / desktop users to install InsightHalo as
 * a PWA. Dismissed state persists in localStorage for 30 days so we don't
 * nag the user constantly.
 */

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "ih_pwa_prompt_dismissed_until";
const SNOOZE_DAYS   = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already dismissed recently?
    const until = localStorage.getItem(DISMISSED_KEY);
    if (until && Date.now() < Number(until)) return;

    // Already installed as standalone?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    // Snooze for 30 days
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + SNOOZE_DAYS * 86400_000));
  };

  const install = async () => {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
        // Don't re-prompt after acceptance
        localStorage.setItem(DISMISSED_KEY, String(Date.now() + 365 * 86400_000));
      }
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card shadow-lg shadow-black/10 px-4 py-3 backdrop-blur-sm">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Add to Home Screen</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Install InsightHalo for instant capture, offline access and push alerts.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={install} disabled={installing}>
            <Download className="h-3.5 w-3.5" />
            {installing ? "Installing…" : "Install"}
          </Button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
