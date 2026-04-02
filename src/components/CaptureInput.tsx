import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Sparkles, Check, Crown } from "lucide-react";
import UploadPicker, { type PendingFile } from "@/components/capture/UploadPicker";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Capture } from "@/types/brain";
import AIResultCard from "@/components/AIResultCard";
import AITriageCard from "@/components/AITriageCard";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import { runAITriage, isAITriageAvailable, triageToAIData, type AITriageResult } from "@/lib/ai-triage";

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

type CapturePhase = "idle" | "recording" | "transcribing" | "processing" | "triaging" | "triage_result" | "done";

interface CaptureInputProps {
  variant?: "inline" | "modal";
  onComplete?: () => void;
}

export default function CaptureInput({ variant = "inline", onComplete }: CaptureInputProps) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [lastResult, setLastResult] = useState<Capture | null>(null);
  const [triageResult, setTriageResult] = useState<{ triage: AITriageResult; source: "ai" | "local" } | null>(null);
  const [capturedText, setCapturedText] = useState("");
  const { addCapture, addCaptureWithAI } = useBrain();
  const { createProject, linkCapture: linkCaptureToProject } = useProjects();
  const { canUseAITriage, recordAITriageUse, shouldShowUpgradePrompt, aiTriageRemaining } = useSubscription();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
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

  // Quick capture (no AI triage — uses local mock-ai as before)
  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle") return;

    setPhase("processing");
    setLastResult(null);
    setTriageResult(null);
    setTimeout(() => {
      const capture = addCapture(trimmed, "text");
      setText("");
      setPendingFiles([]);
      setLastResult(capture);
      setPhase("done");

      const dest = capture.ai_data?.destination_suggestion;
      const destLabel = dest === "today" ? "Today" : dest === "ideas" ? "Ideas Vault" : dest === "projects" ? "Projects" : dest === "someday" ? "Someday" : "Inbox";

      toast.success("Thought captured.", {
        description: `Routed to ${destLabel} as ${capture.ai_data?.category?.replace("_", " ")}`,
      });

      setTimeout(() => {
        setPhase("idle");
        onComplete?.();
        textareaRef.current?.focus();
      }, 3000);
    }, 600);
  }, [text, phase, addCapture, onComplete]);

  // AI triage flow
  const handleAITriage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle") return;

    if (!canUseAITriage) {
      toast.error("AI organize limit reached for today.", {
        description: "Upgrade to Pro for more AI-powered organization.",
        action: { label: "Upgrade", onClick: () => window.location.href = "/upgrade" },
      });
      return;
    }

    setCapturedText(trimmed);
    setPhase("triaging");
    setTriageResult(null);
    setLastResult(null);

    try {
      const result = await runAITriage(trimmed);
      recordAITriageUse();
      setTriageResult({ triage: result.triage, source: result.source });
      setPhase("triage_result");
    } catch {
      const capture = addCapture(trimmed, "text");
      setText("");
      setLastResult(capture);
      setPhase("done");
      toast.info("AI unavailable — captured with smart sort.");
      setTimeout(() => { setPhase("idle"); onComplete?.(); }, 3000);
    }
  }, [text, phase, addCapture, onComplete, canUseAITriage, recordAITriageUse]);

  // Apply triage result — use addCaptureWithAI to preserve real AI data
  const handleApplyTriage = useCallback(() => {
    if (!triageResult || !capturedText) return;

    const aiData = triageToAIData(triageResult.triage, capturedText);
    const reviewStatus = triageResult.triage.confidence >= 0.8 ? "auto_approved" as const : "needs_review" as const;
    const capture = addCaptureWithAI(capturedText, "text", aiData, reviewStatus);
    setText("");
    setLastResult(capture);
    setPhase("done");

    const dest = triageResult.triage.recommendedDestination;
    const destLabel = dest === "today" ? "Today" : dest === "ideas" ? "Ideas Vault" : dest === "projects" ? "Projects" : dest === "someday" ? "Someday" : dest === "memory" ? "Memory" : "Inbox";

    toast.success("AI suggestion applied.", {
      description: `Organized as ${triageResult.triage.type.replace("_", " ")} → ${destLabel}`,
    });

    setTimeout(() => {
      setPhase("idle");
      setTriageResult(null);
      onComplete?.();
      textareaRef.current?.focus();
    }, 3000);
  }, [triageResult, capturedText, addCaptureWithAI, onComplete]);

  // Create project from triage
  const handleCreateProjectFromTriage = useCallback(() => {
    setShowCreateProject(true);
  }, []);

  // Dismiss triage — save as-is
  const handleDismissTriage = useCallback(() => {
    if (!capturedText) return;

    const capture = addCapture(capturedText, "text");
    setText("");
    setLastResult(capture);
    setTriageResult(null);
    setPhase("done");

    toast.success("Thought captured as-is.");

    setTimeout(() => {
      setPhase("idle");
      onComplete?.();
      textareaRef.current?.focus();
    }, 3000);
  }, [capturedText, addCapture, onComplete]);

  const handleVoice = () => {
    if (phase === "recording") {
      if (timerRef.current) clearTimeout(timerRef.current);
      finishRecording();
    } else if (phase === "idle") {
      setPhase("recording");
      setText("");
      setLastResult(null);
      setTriageResult(null);
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
          setTimeout(() => setPhase("idle"), 400);
        }
      }, i * 80);
    });
  };

  const isModal = variant === "modal";
  const isBusy = ["recording", "transcribing", "processing", "triaging", "done"].includes(phase);
  const showAIButton = isAITriageAvailable();

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
          disabled={isBusy || phase === "done"}
          className={`w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 disabled:cursor-not-allowed ${isModal ? "min-h-[120px]" : "min-h-[60px]"}`}
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={phase === "recording" ? "destructive" : "outline"}
              onClick={handleVoice}
              disabled={isBusy || phase === "done"}
              className="gap-1.5 text-xs"
            >
              {phase === "recording" ? (
                <><MicOff className="h-3.5 w-3.5" /> Stop</>
              ) : (
                <><Mic className="h-3.5 w-3.5" /> Voice</>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            {showAIButton && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAITriage}
                disabled={!text.trim() || isBusy}
                className={`gap-1.5 text-xs ${!canUseAITriage ? "opacity-60" : ""}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Organize
                {!canUseAITriage && <Crown className="h-3 w-3 text-primary" />}
                {canUseAITriage && aiTriageRemaining <= 3 && (
                  <span className="text-[9px] text-muted-foreground">({aiTriageRemaining})</span>
                )}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || isBusy || phase === "done"}
              className="gap-1.5 text-xs"
            >
              <Send className="h-3.5 w-3.5" /> Capture
            </Button>
          </div>
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
          <span className="text-xs text-primary font-medium">Organizing…</span>
        </div>
      )}
      {phase === "triaging" && (
        <div className="flex items-center gap-2 px-2 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">AI is analyzing your thought…</span>
        </div>
      )}

      {/* AI Triage result */}
      {phase === "triage_result" && triageResult && (
        <AITriageCard
          triage={triageResult.triage}
          source={triageResult.source}
          onApply={handleApplyTriage}
          onDismiss={handleDismissTriage}
          onCreateProject={handleCreateProjectFromTriage}
        />
      )}

      {/* Done state */}
      {phase === "done" && lastResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Check className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))]" />
            <span className="text-xs text-[hsl(var(--brain-teal))] font-medium">Thought captured and organized</span>
          </div>
          <AIResultCard capture={lastResult} />
        </div>
      )}

      {/* Create Project from triage */}
      {showCreateProject && triageResult && (
        <CreateProjectDialog
          open={showCreateProject}
          onClose={() => {
            setShowCreateProject(false);
            // Also apply the triage to save the capture
            handleApplyTriage();
          }}
          defaultName={triageResult.triage.title}
          defaultDescription={triageResult.triage.summary}
          initialNextAction={triageResult.triage.suggestedNextAction}
        />
      )}
    </div>
  );
}
