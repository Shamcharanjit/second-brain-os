/**
 * OnboardingPage
 *
 * Full-screen 5-step guided first-run wizard shown to brand-new users.
 * Route: /onboarding  (no sidebar — standalone full-screen route)
 *
 * Steps:
 *   1. Welcome
 *   2. Use case selection
 *   3. First capture (AI-powered)
 *   4. Review habit (preferred daily review time)
 *   5. All set — go to dashboard
 *
 * Completion writes "ih_onboarding_v1" to localStorage so it's never shown again.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit, Sparkles, CheckCircle2, ArrowRight, Loader2,
  Briefcase, User, BookOpen, Layers, Clock, Sun, Sunset, Moon,
  Send, Mic, MicOff, Tag, FolderKanban, Calendar, Bell, BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useBrain } from "@/context/BrainContext";
import { runAITriage, triageToAIData, type AITriageResult } from "@/lib/ai-triage";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { trackEvent } from "@/lib/analytics/ga4";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { Capture } from "@/types/brain";

/* ── Constants ── */
const ONBOARDING_KEY = "ih_onboarding_v1";

const USE_CASES = [
  { id: "work",     label: "Work & Business",      icon: Briefcase, desc: "Tasks, projects, client notes, meeting follow-ups" },
  { id: "personal", label: "Personal Life",         icon: User,      desc: "Daily habits, goals, health, personal tasks" },
  { id: "research", label: "Research & Learning",   icon: BookOpen,  desc: "Articles, ideas, book notes, learning goals" },
  { id: "all",      label: "Everything",            icon: Layers,    desc: "I want to capture and organise all aspects of life" },
];

const REVIEW_TIMES = [
  { id: "morning",  label: "Morning",   time: "8:00 AM",  icon: Sun,    desc: "Start the day with clarity" },
  { id: "midday",   label: "Midday",    time: "12:00 PM", icon: Clock,  desc: "Midday check-in to stay on track" },
  { id: "evening",  label: "Evening",   time: "6:00 PM",  icon: Sunset, desc: "Wind down and plan tomorrow" },
  { id: "night",    label: "Night",     time: "9:00 PM",  icon: Moon,   desc: "End-of-day full brain review" },
];

/* ── Progress dots ── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < step ? "bg-primary w-6" : i === step ? "bg-primary/60 w-4" : "bg-muted w-3"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1 tabular-nums">{step}/{total}</span>
    </div>
  );
}

/* ── Step wrapper ── */
function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-400">
      {children}
    </div>
  );
}

/* ── Step 1: Welcome ── */
function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  return (
    <StepCard>
      <div className="rounded-2xl border bg-card p-8 space-y-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BrainCircuit className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome{name ? `, ${name}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            InsightHalo is your AI-powered second brain. It captures everything you throw at it — thoughts, tasks, ideas — and organises them automatically so nothing slips through.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { emoji: "⚡", label: "Instant capture" },
            { emoji: "🤖", label: "AI organises it" },
            { emoji: "🧠", label: "Never forget" },
          ].map((f) => (
            <div key={f.label} className="rounded-xl bg-muted/40 p-3 space-y-1">
              <p className="text-xl">{f.emoji}</p>
              <p className="text-[11px] font-medium text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </div>

        <Button onClick={onNext} className="w-full gap-2" size="lg">
          Let's set up your brain <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

/* ── Step 2: Use case ── */
function StepUseCase({
  selected,
  onToggle,
  onNext,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <StepCard>
      <div className="rounded-2xl border bg-card p-8 space-y-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">How will you use InsightHalo?</h2>
          <p className="text-sm text-muted-foreground">Choose what fits you best. You can change this anytime.</p>
        </div>

        <div className="space-y-2">
          {USE_CASES.map((uc) => {
            const isSelected = selected.has(uc.id);
            return (
              <button
                key={uc.id}
                onClick={() => onToggle(uc.id)}
                className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background hover:bg-muted/30"
                }`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/15" : "bg-muted/60"}`}>
                  <uc.icon className={`h-4.5 w-4.5 h-[18px] w-[18px] ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-foreground/80"}`}>{uc.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{uc.desc}</p>
                </div>
                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        <Button
          onClick={onNext}
          disabled={selected.size === 0}
          className="w-full gap-2"
          size="lg"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

/* ── Step 3: First capture ── */
type CapturePhase = "input" | "processing" | "success";

function StepFirstCapture({
  onNext,
  onSkip,
}: {
  onNext: (captured: boolean) => void;
  onSkip: () => void;
}) {
  const { addCaptureWithAI } = useBrain();
  const [phase, setPhase] = useState<CapturePhase>("input");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ capture: Capture; triage: AITriageResult } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition({
    minConfidence: 0.4,
    onResult: (transcript) => setText(transcript),
  });

  const isListening = speech.state === "listening";
  const isSpeechUnsupported = speech.state === "unsupported";
  const isSecure = typeof window === "undefined" || window.isSecureContext || window.location.hostname === "localhost";

  useEffect(() => {
    if (isListening && speech.interimTranscript) setText(speech.interimTranscript);
  }, [speech.interimTranscript, isListening]);

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
    } catch {
      toast.error("Couldn't capture that. Please try again.");
      setPhase("input");
    }
  }, [text, phase, addCaptureWithAI]);

  if (phase === "success" && result) {
    const { triage } = result;
    const tags = Array.from(new Set([triage.type.replace("_", " "), triage.priority, triage.recommendedDestination]));
    return (
      <StepCard>
        <div className="rounded-2xl border bg-card p-8 space-y-5 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold">AI captured & organised it ✔</h2>
            <p className="text-sm text-muted-foreground">This is what InsightHalo does for every thought you throw at it.</p>
          </div>

          <div className="rounded-xl border bg-background p-4 space-y-3">
            <p className="text-sm font-medium line-clamp-2">{triage.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{triage.summary}</p>
            <div className="border-t border-border/60 pt-2 space-y-2">
              <div className="flex items-start gap-2">
                <Tag className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary capitalize">{t}</span>
                  ))}
                </div>
              </div>
              {triage.suggestedNextAction && (
                <div className="flex items-start gap-2">
                  <FolderKanban className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Next: </span>{triage.suggestedNextAction}</p>
                </div>
              )}
            </div>
          </div>

          <Button onClick={() => onNext(true)} className="w-full gap-2" size="lg">
            Next step <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </StepCard>
    );
  }

  const isProcessing = phase === "processing" || speech.state === "processing";

  return (
    <StepCard>
      <div className="rounded-2xl border bg-card p-8 space-y-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Capture your first thought</h2>
          <p className="text-sm text-muted-foreground">Type any task, idea, or reminder. AI will tag, organise, and route it for you.</p>
        </div>

        <div className="rounded-xl border bg-background p-3 transition-colors focus-within:border-primary/40">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCapture(); } }}
            placeholder="e.g. Research Razorpay integration for subscription billing…"
            disabled={isProcessing || isListening}
            className="min-h-[90px] w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
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

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">AI is organising this…</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleCapture}
            disabled={!text.trim() || isProcessing || isListening}
            className="flex-1 gap-1.5"
          >
            {isProcessing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Capturing…</>
              : <><Send className="h-4 w-4" /> Capture with AI</>
            }
          </Button>
          {!isSpeechUnsupported && isSecure && (
            <Button
              variant="outline"
              onClick={() => {
                if (isListening) { speech.stopListening(); return; }
                speech.reset(); setText(""); speech.startListening();
              }}
              disabled={isProcessing || isSpeechUnsupported}
              className="gap-1.5 px-3"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <button
          onClick={onSkip}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
        >
          Skip for now →
        </button>
      </div>
    </StepCard>
  );
}

/* ── Step 4: Review time ── */
function StepReviewTime({
  selected,
  onSelect,
  onNext,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <StepCard>
      <div className="rounded-2xl border bg-card p-8 space-y-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">When's your best time to review?</h2>
          <p className="text-sm text-muted-foreground">
            A daily 2-minute review keeps your brain sharp. We'll remind you at your chosen time.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {REVIEW_TIMES.map((rt) => {
            const isSelected = selected === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => onSelect(rt.id)}
                className={`rounded-xl border p-4 text-left transition-all space-y-2 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-background hover:bg-muted/30"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary/15" : "bg-muted/60"}`}>
                  <rt.icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-foreground/80"}`}>{rt.label}</p>
                  <p className={`text-xs font-mono ${isSelected ? "text-primary" : "text-muted-foreground"}`}>{rt.time}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{rt.desc}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <Button
            onClick={onNext}
            disabled={!selected}
            className="w-full gap-2"
            size="lg"
          >
            <Calendar className="h-4 w-4" /> Set review time <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            onClick={onNext}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
          >
            I'll decide later →
          </button>
        </div>
      </div>
    </StepCard>
  );
}

/* ── Step 5: Enable notifications ── */
function StepNotifications({ onNext }: { onNext: (enabled: boolean) => void }) {
  const { state, subscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isUnsupported = state === "unsupported" || state === "denied";

  const handleEnable = async () => {
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    setDone(ok);
    if (ok) setTimeout(() => onNext(true), 1200);
  };

  return (
    <StepCard>
      <div className="rounded-2xl border bg-card p-8 space-y-6 shadow-sm text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${done ? "bg-primary/10" : "bg-muted"}`}>
          {done ? (
            <BellRing className="h-8 w-8 text-primary" />
          ) : (
            <Bell className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            {done ? "Notifications on! 🔔" : "Never miss a beat"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {done
              ? "We'll remind you for reviews, streak alerts, and important tasks — right on time."
              : "Get smart reminders: morning brief, streak alerts, review nudges. Only when it matters."}
          </p>
        </div>

        {!done && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { emoji: "☀️", label: "Morning brief" },
              { emoji: "🔥", label: "Streak alerts" },
              { emoji: "✅", label: "Review nudges" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-muted/40 p-3 space-y-1">
                <p className="text-xl">{f.emoji}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
        )}

        {isUnsupported ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {state === "denied"
                ? "Notifications are blocked in your browser. You can enable them later in Settings."
                : "Your browser doesn't support push notifications. Enable them later from Settings."}
            </p>
            <Button onClick={() => onNext(false)} className="w-full gap-2" variant="outline">
              Continue anyway <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : done ? null : (
          <div className="space-y-2">
            <Button
              onClick={handleEnable}
              disabled={loading || state === "loading"}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enabling…</>
              ) : (
                <><Bell className="h-4 w-4" /> Enable notifications</>
              )}
            </Button>
            <button
              onClick={() => onNext(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
            >
              Maybe later →
            </button>
          </div>
        )}
      </div>
    </StepCard>
  );
}

/* ── Step 6: All set ── */
function StepAllSet({
  useCases,
  reviewTime,
  captureCompleted,
  notificationsEnabled,
  onFinish,
}: {
  useCases: Set<string>;
  reviewTime: string | null;
  captureCompleted: boolean;
  notificationsEnabled: boolean;
  onFinish: () => void;
}) {
  const ucLabels = USE_CASES.filter((u) => useCases.has(u.id)).map((u) => u.label);
  const rtLabel = REVIEW_TIMES.find((r) => r.id === reviewTime)?.label ?? null;

  return (
    <StepCard>
      <div className="rounded-2xl border bg-card p-8 space-y-6 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Your brain is ready! 🎉</h2>
          <p className="text-sm text-muted-foreground">
            InsightHalo is set up and waiting for your thoughts. Start capturing, and let AI do the organising.
          </p>
        </div>

        {/* Summary of what was set up */}
        <div className="rounded-xl bg-muted/30 border p-4 space-y-2.5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your setup</p>
          {ucLabels.length > 0 && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">Use case: <span className="font-medium">{ucLabels.join(", ")}</span></p>
            </div>
          )}
          <div className="flex items-start gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${captureCompleted ? "text-primary" : "text-muted-foreground/40"}`} />
            <p className="text-xs text-foreground">
              First capture: <span className="font-medium">{captureCompleted ? "Done ✔" : "Skipped (do it from the dashboard)"}</span>
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${rtLabel ? "text-primary" : "text-muted-foreground/40"}`} />
            <p className="text-xs text-foreground">
              Daily review time: <span className="font-medium">{rtLabel ? `${rtLabel} review` : "Not set — change in Settings"}</span>
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${notificationsEnabled ? "text-primary" : "text-muted-foreground/40"}`} />
            <p className="text-xs text-foreground">
              Push notifications: <span className="font-medium">{notificationsEnabled ? "Enabled ✔" : "Off — enable in Settings"}</span>
            </p>
          </div>
        </div>

        <Button onClick={onFinish} className="w-full gap-2" size="lg">
          Open InsightHalo <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════
   Main OnboardingPage component
   ══════════════════════════════ */
const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If already onboarded, go straight to dashboard
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) navigate("/app", { replace: true });
  }, [navigate]);

  const [step, setStep] = useState(1);
  const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());
  const [reviewTime, setReviewTime] = useState<string | null>(null);
  const [captureCompleted, setCaptureCompleted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Derive user's first name from email
  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "";

  const toggleUseCase = useCallback((id: string) => {
    setSelectedUseCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const finishOnboarding = useCallback(() => {
    const payload = {
      useCases: [...selectedUseCases],
      reviewTime,
      captureCompleted,
      notificationsEnabled,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(payload));
    trackEvent("onboarding_completed", {
      use_cases: [...selectedUseCases].join(","),
      review_time: reviewTime ?? "skipped",
      capture_done: captureCompleted,
      notifications_enabled: notificationsEnabled,
    });
    navigate("/app", { replace: true });
  }, [selectedUseCases, reviewTime, captureCompleted, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b bg-card/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between shrink-0">
        <InsightHaloLogo variant="auth" />
        <ProgressBar step={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {step === 1 && (
          <StepWelcome
            name={firstName}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepUseCase
            selected={selectedUseCases}
            onToggle={toggleUseCase}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepFirstCapture
            onNext={(captured) => { setCaptureCompleted(captured); setStep(4); }}
            onSkip={() => { setCaptureCompleted(false); setStep(4); }}
          />
        )}

        {step === 4 && (
          <StepReviewTime
            selected={reviewTime}
            onSelect={setReviewTime}
            onNext={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <StepNotifications
            onNext={(enabled) => { setNotificationsEnabled(enabled); setStep(6); }}
          />
        )}

        {step === 6 && (
          <StepAllSet
            useCases={selectedUseCases}
            reviewTime={reviewTime}
            captureCompleted={captureCompleted}
            notificationsEnabled={notificationsEnabled}
            onFinish={finishOnboarding}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="text-center pb-6 shrink-0">
        <p className="text-xs text-muted-foreground/50">
          Already set up?{" "}
          <button
            onClick={() => { localStorage.setItem(ONBOARDING_KEY, '{"skipped":true}'); navigate("/app", { replace: true }); }}
            className="underline hover:text-muted-foreground transition-colors"
          >
            Skip to dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
