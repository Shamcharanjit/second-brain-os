/**
 * ShareTargetPage
 *
 * Handles the Web Share Target API — when a user shares content
 * from another app to InsightHalo, the browser opens this page with
 * ?title=&text=&url= params. We combine them into a prefill string
 * and redirect to the main capture screen.
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BrainCircuit } from "lucide-react";

export default function ShareTargetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const text  = searchParams.get("text")  || "";
    const url   = searchParams.get("url")   || "";

    // Build a sensible capture string from whatever was shared
    const parts: string[] = [];
    if (title) parts.push(title);
    if (text && text !== title) parts.push(text);
    if (url) parts.push(url);

    const combined = parts.join("\n").trim();

    // Redirect to /app with prefill param so CaptureInput pre-fills the textarea
    const dest = combined
      ? `/app?prefill=${encodeURIComponent(combined)}`
      : "/app";

    navigate(dest, { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrainCircuit className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Opening InsightHalo…</p>
      </div>
    </div>
  );
}
