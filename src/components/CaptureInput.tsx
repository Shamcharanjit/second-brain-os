import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, MicOff, Send, Sparkles, Check, Crown } from "lucide-react";
import UploadPicker, { type PendingFile } from "@/components/capture/UploadPicker";
import RecurrencePicker from "@/components/capture/RecurrencePicker";
import type { RecurrenceType } from "@/types/brain";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Capture } from "@/types/brain";
import AIResultCard from "@/components/AIResultCard";
import AITriageCard from "@/components/AITriageCard";
import FollowUpReminderCard from "@/components/FollowUpReminderCard";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import { runAITriage, isAITriageAvailable, triageToAIData, type AITriageResult } from "@/lib/ai-triage";
import { useUploadAttachments, type UploadResult } from "@/hooks/useUploadAttachments";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useDuplicateCheck } from "@/hooks/useDuplicateCheck";
import { useAllTags } from "@/hooks/useAllTags";
import { AlertTriangle, Tag } from "lucide-react";


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
  const [searchParams, setSearchParams] = useSearchParams();
  const [text, setText] = useState(() => {
    // Pre-fill from Web Share Target (?prefill=...) — consumed once on mount
    return searchParams.get("prefill") || "";
  });
  const [captureInputType, setCaptureInputType] = useState<"text" | "voice">("text");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [lastResult, setLastResult] = useState<Capture | null>(null);
  const [showReminderCard, setShowReminderCard] = useState(false);
  const [triageResult, setTriageResult] = useState<{ triage: AITriageResult; source: "ai" | "local" | "unavailable" } | null>(null);
  const [capturedText, setCapturedText] = useState("");
  const { addCapture, addCaptureWithAI, captures } = useBrain();
  const { createProject, linkCapture: linkCaptureToProject } = useProjects();
  const { canUseAITriage, recordAITriageUse, shouldShowUpgradePrompt, aiTriageRemaining } = useSubscription();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceType | null>(null);
  const { uploadFiles } = useUploadAttachments();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Duplicate detection — debounced via useMemo inside the hook
  const duplicate = useDuplicateCheck(text);

  // Tag auto-suggest — top 8 most-used tags from existing captures
  const allTags = useAllTags();
  const suggestedTags = allTags.slice(0, 8).map((t) => t.tag);
  const [showTagSuggest, setShowTagSuggest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  /** Decide whether to offer a Day-2 follow-up reminder for this capture. */
  function shouldOfferReminder(capture: Capture): boolean {
    const ai = capture.ai_data;
    if (!ai) return false;
    const reminderCategories = new Set(["task", "reminder", "follow_up", "idea", "goal"]);
    if (reminderCategories.has(ai.category)) return true;
    if ((ai.priority_score ?? 0) >= 60) return true;
    if (ai.urgency === "high") return true;
    return false;
  }

  // Rotate placeholders
  useEffect(() => {
    if (phase !== "idle") return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  // NOTE: do not auto-reset captureInputType here — voice paths must keep
  // input_type = "voice" until the capture is actually submitted (handleSubmit
  // / handleApplyTriage / handleDismissTriage explicitly reset it after use).

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Clear ?prefill= from URL after consuming it (prevents re-fill on refresh)
  useEffect(() => {
    if (searchParams.has("prefill")) {
      searchParams.delete("prefill");
      setSearchParams(searchParams, { replace: true });
      // Focus the textarea so user can immediately submit or edit
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus on mount for users still building activation momentum (<3 captures).
  // Removes the "find the input box" friction on first/early sessions.
  useEffect(() => {
    if (variant !== "inline") return;
    if (captures.length >= 3) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const capture = addCapture(captureText, captureInputType, recurrence);
    setText("");
    setCaptureInputType("text");
    setRecurrence(null);
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

    const offerReminder = shouldOfferReminder(capture);
    setShowReminderCard(offerReminder);

    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      setPhase("idle");
      setShowReminderCard(false);
      onComplete?.();
      textareaRef.current?.focus();
    }, offerReminder ? 12000 : 3000);
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
      const capture = addCapture(trimmed, captureInputType, recurrence);
      setText("");
      setCaptureInputType("text");
      setRecurrence(null);
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
    const capture = addCaptureWithAI(capturedText, captureInputType, aiData, reviewStatus, recurrence);
    setText("");
    setCaptureInputType("text");
    setRecurrence(null);

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

    const offerReminder = shouldOfferReminder(capture);
    setShowReminderCard(offerReminder);

    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      setPhase("idle");
      setTriageResult(null);
      setShowReminderCard(false);
      onComplete?.();
      textareaRef.current?.focus();
    }, offerReminder ? 12000 : 3000);
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

  // --- Voice capture via centralized hook (full mic cleanup on Safari/macOS) ---
  const speech = useSpeechRecognition({
    onResult: (transcript) => {
      // Final transcript committed by hook — pin input_type to "voice"
      if (transcript) {
        setText(transcript);
        setCaptureInputType("voice");
      }
    },
  });

  // Mirror hook state into local phase so UI shows "Listening…"
  useEffect(() => {
    if (speech.state === "listening") {
      setPhase("recording");
    } else if (phase === "recording" && (speech.state === "idle" || speech.state === "captured" || speech.state === "error")) {
      setPhase("idle");
    }
  }, [speech.state, phase]);

  // Show interim transcript live in textarea, but never overwrite once final committed
  useEffect(() => {
    if (speech.state === "listening" && speech.interimTranscript) {
      setText(speech.interimTranscript);
      setCaptureInputType("voice");
    }
  }, [speech.interimTranscript, speech.state]);

  // Surface voice errors as toasts (skip the noisy "no speech" path)
  useEffect(() => {
    if (speech.state === "error" && speech.errorMessage) {
      if (/no speech/i.test(speech.errorMessage)) {
        toast.info(speech.errorMessage);
      } else if (!/aborted/i.test(speech.errorMessage)) {
        toast.error(speech.errorMessage);
      }
      speech.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.state, speech.errorMessage]);

  const handleVoice = useCallback(() => {
    if (phase === "recording") {
      // Manual stop — hook will finalize transcript & fully release the mic
      speech.stopListening();
      return;
    }
    if (phase !== "idle") return;
    if (speech.state === "unsupported") {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    setText("");
    setLastResult(null);
    setTriageResult(null);
    setCaptureInputType("voice");
    speech.reset();
    speech.startListening();
  }, [phase, speech]);

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

        {/* Duplicate warning */}
        {duplicate && phase === "idle" && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 mt-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Possible duplicate</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                Similar capture: "{duplicate.capture.ai_data?.title ?? duplicate.capture.raw_input.slice(0, 60)}"
              </p>
            </div>
          </div>
        )}

        {/* Tag auto-suggest chips */}
        {showTagSuggest && suggestedTags.length > 0 && phase === "idle" && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setText((prev) => prev ? `${prev.trim()} #${tag}` : `#${tag}`);
                  setShowTagSuggest(false);
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </button>
            ))}
          </div>
        )}

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

        <div className="flex flex-col gap-2 pt-2 border-t border-border/50 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={phase === "recording" ? "destructive" : "outline"}
              onClick={handleVoice}
              disabled={isBusy || phase === "done"}
              className="gap-1.5 text-xs h-8 px-2.5"
            >
              {phase === "recording" ? (
                <><MicOff className="h-3.5 w-3.5" /><span className="hidden xs:inline">Stop</span></>
              ) : (
                <><Mic className="h-3.5 w-3.5" /><span className="hidden xs:inline">Voice</span></>
              )}
            </Button>
            <UploadPicker
              files={pendingFiles}
              onChange={setPendingFiles}
              disabled={isBusy || phase === "done"}
            />
            <RecurrencePicker
              value={recurrence}
              onChange={setRecurrence}
              disabled={isBusy || phase === "done"}
            />
            {suggestedTags.length > 0 && (
              <Button
                size="sm"
                variant={showTagSuggest ? "secondary" : "ghost"}
                onClick={() => setShowTagSuggest((v) => !v)}
                disabled={isBusy || phase === "done"}
                className="gap-1 text-xs px-2 h-8"
                title="Tag suggestions"
              >
                <Tag className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {showAIButton && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAITriage}
                disabled={!text.trim() || isBusy}
                className={`gap-1.5 text-xs h-8 ${!canUseAITriage ? "opacity-60" : ""}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">AI Organize</span>
                <span className="xs:hidden">AI</span>
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
              className="gap-1.5 text-xs h-8"
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
          {showReminderCard && (
            <FollowUpReminderCard
              captureId={lastResult.id}
              captureText={lastResult.raw_input}
              captureTitle={lastResult.ai_data?.title ?? null}
              onDone={() => setShowReminderCard(false)}
            />
          )}
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
