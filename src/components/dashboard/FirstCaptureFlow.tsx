import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mic, MicOff, Send, Check, Loader2, ArrowRight, Tag, FolderKanban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useBrain } from "@/context/BrainContext";
import { runAITriage, triageToAIData, type AITriageResult } from "@/lib/ai-triage";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { Capture } from "@/types/brain";

type Phase = "input" | "processing" | "success";

interface FirstCaptureFlowProps {
  onComplete?: () => void;
}

export default function FirstCaptureFlow({ onComplete }: FirstCaptureFlowProps) {
  const navigate = useNavigate();
  const { addCaptureWithAI } = useBrain();

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ capture: Capture; triage: AITriageResult } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Voice (shared hook handles permissions, mobile sync-start, state machine) ──
  const speech = useSpeechRecognition({
    minConfidence: 0.4,
    onResult: (transcript) => {
      // Fill the textarea with the final transcript so the user can review/edit
      // before submitting. Do NOT auto-submit — gives the user control.
      setText(transcript);
    },
  });

  const isUnsupported = speech.state === "unsupported";
  const isListening = speech.state === "listening";
  const isSpeechProcessing = speech.state === "processing";
  const isSecure = typeof window === "undefined" || window.isSecureContext || window.location.hostname === "localhost";

  // Mirror interim transcript into the textarea for live preview
  useEffect(() => {
    if (isListening && speech.interimTranscript) {
      setText(speech.interimTranscript);
    }
  }, [speech.interimTranscript, isListening]);

  // Surface speech errors via toast
  useEffect(() => {
    if (speech.state === "error" && speech.errorMessage) {
      toast.error(speech.errorMessage);
    }
  }, [speech.state, speech.errorMessage]);

  useEffect(() => {
    if (phase === "input" && !isListening) textareaRef.current?.focus();
  }, [phase, isListening]);

  const handleCapture = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "input") return;

    setPhase("processing");
    try {
      const { triage } = await runAITriage(trimmed);
      const aiData = triageToAIData(triage, trimmed);
      const reviewStatus = triage.confidence >= 0.8 ? ("auto_approved" as const) : ("needs_review" as const);
      const capture = addCaptureWithAI(trimmed, "text", aiData, reviewStatus);
      setResult({ capture, triage });
      setPhase("success");
      toast.success("Insight captured.", { description: "InsightHalo organized this automatically." });
    } catch (err) {
      console.error("[FirstCaptureFlow] capture failed:", err);
      toast.error("Couldn't capture that. Please try again.");
      setPhase("input");
    }
  }, [text, phase, addCaptureWithAI]);

  const handleVoice = useCallback(() => {
    if (phase !== "input") return;

    if (isListening) {
      speech.stopListening();
      return;
    }

    if (isUnsupported) {
      toast.error("Voice capture isn't supported in this browser. Try Chrome, Edge, or Safari (iOS 14.5+).");
      return;
    }

    if (!isSecure) {
      toast.error("Voice capture requires HTTPS. Please open the site over a secure connection.");
      return;
    }

    // Reset prior state and start. IMPORTANT: startListening() must be called
    // synchronously inside this user-gesture handler — the shared hook does
    // that internally. Do not await anything before this call.
    speech.reset();
    setText("");
    speech.startListening();
  }, [phase, isListening, isUnsupported, isSecure, speech]);

  const handleAnother = useCallback(() => {
    setResult(null);
    setText("");
    speech.reset();
    setPhase("input");
  }, [speech]);

  const handleOpenWorkspace = useCallback(() => {
    onComplete?.();
    navigate("/app");
  }, [navigate, onComplete]);

  // ── Screen 2: Success ──
  if (phase === "success" && result) {
    const { triage } = result;
    const tags = Array.from(new Set([
      triage.type.replace("_", " "),
      triage.priority,
      triage.recommendedDestination,
    ]));

    return (
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Insight captured <span className="text-primary">✔</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            InsightHalo organized this automatically
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <p className="text-sm font-medium text-foreground line-clamp-2">{triage.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-3">{triage.summary}</p>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-start gap-2">
              <Tag className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary capitalize"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {triage.suggestedNextAction && (
              <div className="flex items-start gap-2">
                <FolderKanban className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Suggested next step: </span>
                  {triage.suggestedNextAction}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleAnother} className="flex-1 gap-1.5">
            <Sparkles className="h-4 w-4" />
            Capture another idea
          </Button>
          <Button onClick={handleOpenWorkspace} className="flex-1 gap-1.5">
            Open workspace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Screen 1: Input ──
  const isProcessing = phase === "processing" || isSpeechProcessing;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Capture your first idea in 10 seconds
        </h2>
        <p className="text-sm text-muted-foreground">
          InsightHalo will tag, organize, and suggest a project for you.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-3 transition-colors focus-within:border-primary/40">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCapture();
            }
          }}
          placeholder="Example: business idea, reminder, task, thought"
          disabled={phase === "processing" || isListening}
          className="min-h-[100px] w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
        />
      </div>

      {isListening && (
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-xs font-medium text-destructive">Listening… tap Stop when done</span>
        </div>
      )}

      {phase === "processing" && (
        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium">InsightHalo is organizing this…</span>
        </div>
      )}

      {(isUnsupported || !isSecure) && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <span>
            {isUnsupported
              ? "Voice capture isn't supported in this browser. Try Chrome, Edge, or Safari (iOS 14.5+)."
              : "Voice capture requires HTTPS."}
            {" "}You can still type your idea above.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleCapture}
          disabled={!text.trim() || isProcessing || isListening}
          className="flex-1 gap-1.5"
        >
          {phase === "processing" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Capturing…</>
          ) : (
            <><Send className="h-4 w-4" /> Capture with AI</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleVoice}
          disabled={phase === "processing" || isUnsupported || !isSecure}
          className="flex-1 gap-1.5"
        >
          {isListening ? (
            <><MicOff className="h-4 w-4" /> Stop</>
          ) : (
            <><Mic className="h-4 w-4" /> Speak instead</>
          )}
        </Button>
      </div>
    </div>
  );
}
