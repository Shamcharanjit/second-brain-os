import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Sparkles, Check } from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const VOICE_TRANSCRIPTS = [
  "Remind me to send the project update to the team by tomorrow",
  "Idea: build a weekly digest email for all captured thoughts",
  "Call the accountant about quarterly tax filing",
  "Follow up with design team about the new landing page mockups",
  "Maybe later: explore integrating calendar sync with this app",
  "Buy office supplies and restock printer paper today",
];

const PLACEHOLDERS = [
  "Remind me to send proposal tomorrow…",
  "Idea: build a planner for voice-first capture…",
  "Need to call bank about account issue…",
  "Book dentist appointment next week…",
  "Follow up with Sarah about the report…",
  "What if we added a weekly review feature?…",
];

type CapturePhase = "idle" | "recording" | "transcribing" | "processing" | "done";

interface CaptureInputProps {
  variant?: "inline" | "modal";
  onComplete?: () => void;
}

export default function CaptureInput({ variant = "inline", onComplete }: CaptureInputProps) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const { addCapture } = useBrain();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Rotate placeholders
  useEffect(() => {
    if (phase !== "idle") return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle") return;

    setPhase("processing");
    setTimeout(() => {
      addCapture(trimmed, "text");
      setText("");
      setPhase("done");
      toast.success("Saved to Inbox", { description: "AI organized your thought." });
      setTimeout(() => {
        setPhase("idle");
        onComplete?.();
        textareaRef.current?.focus();
      }, 800);
    }, 1200);
  }, [text, phase, addCapture, onComplete]);

  const handleVoice = () => {
    if (phase === "recording") {
      if (timerRef.current) clearTimeout(timerRef.current);
      finishRecording();
    } else if (phase === "idle") {
      setPhase("recording");
      setText("");
      timerRef.current = setTimeout(() => finishRecording(), 2500);
    }
  };

  const finishRecording = () => {
    setPhase("transcribing");
    const transcript = VOICE_TRANSCRIPTS[Math.floor(Math.random() * VOICE_TRANSCRIPTS.length)];
    const words = transcript.split(" ");
    let current = "";
    words.forEach((word, i) => {
      setTimeout(() => {
        current += (i === 0 ? "" : " ") + word;
        setText(current);
        if (i === words.length - 1) {
          // Let user edit before submitting — go back to idle
          setTimeout(() => setPhase("idle"), 400);
        }
      }, i * 80);
    });
  };

  const isModal = variant === "modal";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border bg-card shadow-sm transition-all focus-within:border-primary/40 focus-within:shadow-md ${isModal ? "p-4" : "p-3"}`}>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
          placeholder={phase === "idle" ? PLACEHOLDERS[placeholderIdx] : ""}
          disabled={phase === "recording" || phase === "transcribing" || phase === "processing" || phase === "done"}
          className={`w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 disabled:cursor-not-allowed ${isModal ? "min-h-[120px]" : "min-h-[60px]"}`}
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={phase === "recording" ? "destructive" : "outline"}
              onClick={handleVoice}
              disabled={phase === "transcribing" || phase === "processing" || phase === "done"}
              className="gap-1.5 text-xs"
            >
              {phase === "recording" ? (
                <><MicOff className="h-3.5 w-3.5" /> Stop</>
              ) : (
                <><Mic className="h-3.5 w-3.5" /> Voice</>
              )}
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || phase !== "idle"}
            className="gap-1.5 text-xs"
          >
            <Send className="h-3.5 w-3.5" /> Capture
          </Button>
        </div>
      </div>

      {/* Status indicators */}
      {phase === "recording" && (
        <div className="flex items-center gap-2 px-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-xs text-destructive font-medium">Listening…</span>
        </div>
      )}
      {phase === "transcribing" && (
        <div className="flex items-center gap-2 px-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <span className="text-xs text-primary font-medium">Transcribing…</span>
        </div>
      )}
      {phase === "processing" && (
        <div className="flex items-center gap-2 px-2 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">AI is organizing your thought…</span>
        </div>
      )}
      {phase === "done" && (
        <div className="flex items-center gap-2 px-2">
          <Check className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))]" />
          <span className="text-xs text-[hsl(var(--brain-teal))] font-medium">Saved to Inbox</span>
        </div>
      )}
    </div>
  );
}
