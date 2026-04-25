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
import { useUploadAttachments, type UploadResult } from "@/hooks/useUploadAttachments";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";


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
  const [captureInputType, setCaptureInputType] = useState<"text" | "voice">("text");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [lastResult, setLastResult] = useState<Capture | null>(null);
  const [triageResult, setTriageResult] = useState<{ triage: AITriageResult; source: "ai" | "local" | "unavailable" } | null>(null);
  const [capturedText, setCapturedText] = useState("");
  const { addCapture, addCaptureWithAI } = useBrain();
  const { createProject, linkCapture: linkCaptureToProject } = useProjects();
  const { canUseAITriage, recordAITriageUse, shouldShowUpgradePrompt, aiTriageRemaining } = useSubscription();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const { uploadFiles } = useUploadAttachments();
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
    if (phase !== "recording" && text.trim().length === 0) {
      setCaptureInputType("text");
    }
  }, [phase, text]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Build fallback text when files present but no text
  const buildCaptureText = useCallback((trimmed: string, files: PendingFile[]): string => {
    if (trimmed) return trimmed;
    if (files.length === 1) return `Uploaded file: ${files[0].file.name}`;
    return `Uploaded ${files.length} files`;
  }, []);

  // Report upload results via toast
  const reportUploadResults = useCallback((results: UploadResult[]) => {
    const failed = results.filter((r) => !r.success);
    if (failed.length === 0) return;
    if (failed.length === results.length) {
      toast.error("Couldn't upload files.", { description: "Please try again." });
    } else {
      toast.warning(`${failed.length} of ${results.length} file(s) couldn't be uploaded.`);
    }
  }, []);

  // Quick capture (no AI triage — uses local mock-ai as before)
  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!trimmed && !hasFiles) return;
    if (phase !== "idle") return;
    // Guard: prevent rapid double-submit
    if (timerRef.current) return;

    setPhase("processing");
    setLastResult(null);
    setTriageResult(null);

    // Small delay for UX feedback
    await new Promise((r) => setTimeout(r, 400));

    const captureText = buildCaptureText(trimmed, pendingFiles);
    const capture = addCapture(captureText, captureInputType);
    setText("");
    setCaptureInputType("text");
    setLastResult(capture);

    // Upload files in background
    const filesToUpload = [...pendingFiles];
    setPendingFiles([]);

    if (filesToUpload.length > 0) {
      const results = await uploadFiles(capture.id, filesToUpload);
      reportUploadResults(results);
      const failedFiles = filesToUpload.filter((pf) => results.find((r) => r.fileId === pf.id && !r.success));
      if (failedFiles.length > 0) {
        setPendingFiles(failedFiles);
      }
    }

    setPhase("done");
    const dest = capture.ai_data?.destination_suggestion;
    const destLabel = dest === "today" ? "Today" : dest === "ideas" ? "Ideas Vault" : dest === "projects" ? "Projects" : dest === "someday" ? "Someday" : "Inbox";
    const fileNote = filesToUpload.length > 0 ? ` + ${filesToUpload.length} file(s)` : "";
    toast.success("Thought captured.", {
      description: `Sorted to ${destLabel} as ${capture.ai_data?.category?.replace("_", " ")}${fileNote}`,
    });

    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      setPhase("idle");
      onComplete?.();
      textareaRef.current?.focus();
    }, 3000);
  }, [text, phase, pendingFiles, addCapture, captureInputType, onComplete, buildCaptureText, uploadFiles, reportUploadResults]);

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
      const capture = addCapture(trimmed, captureInputType);
      setText("");
      setCaptureInputType("text");
      setPendingFiles([]);
      setLastResult(capture);
      setPhase("done");
      toast.info("AI unavailable — captured with smart sort.");
      setTimeout(() => { setPhase("idle"); onComplete?.(); }, 3000);
    }
  }, [text, phase, addCapture, captureInputType, onComplete, canUseAITriage, recordAITriageUse]);

  // Apply triage result — use addCaptureWithAI to preserve real AI data
  const handleApplyTriage = useCallback(async () => {
    if (!triageResult || !capturedText) return;

    const aiData = triageToAIData(triageResult.triage, capturedText);
    const reviewStatus = triageResult.triage.confidence >= 0.8 ? "auto_approved" as const : "needs_review" as const;
    const capture = addCaptureWithAI(capturedText, captureInputType, aiData, reviewStatus);
    setText("");
    setCaptureInputType("text");

    const filesToUpload = [...pendingFiles];
    setPendingFiles([]);
    setLastResult(capture);
    setPhase("done");

    if (filesToUpload.length > 0) {
      const results = await uploadFiles(capture.id, filesToUpload);
      reportUploadResults(results);
    }

    const dest = triageResult.triage.recommendedDestination;
    const destLabel = dest === "today" ? "Today" : dest === "ideas" ? "Ideas Vault" : dest === "projects" ? "Projects" : dest === "someday" ? "Someday" : dest === "memory" ? "Memory" : "Inbox";

    toast.success("AI suggestion applied.", {
      description: `Organized as ${triageResult.triage.type.replace("_", " ")} → ${destLabel}`,
    });

    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      setPhase("idle");
      setTriageResult(null);
      onComplete?.();
      textareaRef.current?.focus();
    }, 3000);
  }, [triageResult, capturedText, pendingFiles, addCaptureWithAI, captureInputType, onComplete, uploadFiles, reportUploadResults]);

  // Create project from triage
  const handleCreateProjectFromTriage = useCallback(() => {
    setShowCreateProject(true);
  }, []);

  // Dismiss triage — save as-is
  const handleDismissTriage = useCallback(async () => {
    if (!capturedText) return;

    const capture = addCapture(capturedText, captureInputType);
    setText("");
    setCaptureInputType("text");

    const filesToUpload = [...pendingFiles];
    setPendingFiles([]);
    setLastResult(capture);
    setTriageResult(null);
    setPhase("done");

    if (filesToUpload.length > 0) {
      const results = await uploadFiles(capture.id, filesToUpload);
      reportUploadResults(results);
    }

    toast.success("Thought captured as-is.");

    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      setPhase("idle");
      onComplete?.();
      textareaRef.current?.focus();
    }, 3000);
  }, [capturedText, pendingFiles, addCapture, captureInputType, onComplete, uploadFiles, reportUploadResults]);

  // --- Real voice capture via Web Speech API ---
  const speechRecognitionRef = useRef<any>(null);
  const voiceCommittedRef = useRef(false);

  const handleVoice = () => {
    if (phase === "recording") {
      // Stop recording — do NOT reset phase here; let onresult/onend handle it
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
    } else if (phase === "idle") {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionCtor) {
        toast.error("Speech recognition not supported in this browser.");
        return;
      }

      setPhase("recording");
      setText("");
      setCaptureInputType("voice");
      setLastResult(null);
      setTriageResult(null);
      voiceCommittedRef.current = false;

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      speechRecognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (final && !voiceCommittedRef.current) {
          voiceCommittedRef.current = true;
          setText(final.trim());
          setCaptureInputType("voice");
          // Don't set phase to idle yet — onend will finalize
        } else if (interim) {
          setText(interim);
          setCaptureInputType("voice");
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") {
          toast.info("No speech detected. Please try again.");
        } else if (event.error !== "aborted") {
          toast.error(`Voice error: ${event.error}`);
        }
        setPhase("idle");
        if (!voiceCommittedRef.current) setCaptureInputType("text");
      };

      recognition.onend = () => {
        speechRecognitionRef.current = null;
        // Transition back to idle so user can review and submit
        setPhase("idle");
        if (voiceCommittedRef.current || text.trim()) {
          setCaptureInputType("voice");
        }
      };

      try {
        recognition.start();
      } catch {
        toast.error("Could not start voice recognition.");
        setPhase("idle");
        setCaptureInputType("text");
      }
    }
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

        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {pendingFiles.map((pf) => (
              <div
                key={pf.id}
                className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-xs"
              >
                <span className="max-w-[120px] truncate text-foreground">{pf.file.name}</span>
                <span className="text-muted-foreground">{pf.file.size < 1024 * 1024 ? `${(pf.file.size / 1024).toFixed(1)} KB` : `${(pf.file.size / (1024 * 1024)).toFixed(1)} MB`}</span>
                <button
                  type="button"
                  onClick={() => setPendingFiles(pendingFiles.filter(f => f.id !== pf.id))}
                  className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <span className="sr-only">Remove</span>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

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
            <UploadPicker
              files={pendingFiles}
              onChange={setPendingFiles}
              disabled={isBusy || phase === "done"}
            />
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
              disabled={(!text.trim() && pendingFiles.length === 0) || isBusy || phase === "done"}
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
