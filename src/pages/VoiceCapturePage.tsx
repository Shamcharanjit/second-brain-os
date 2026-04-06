import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Mic, MicOff, Square, Check, Sparkles, Car, Clock,
  ArrowRight, FolderOpen, ShieldCheck, ShieldQuestion,
  Lightbulb, ListChecks, Bell, Users, BrainCircuit, Volume2,
} from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const VOICE_TRANSCRIPTS = [
  "Remind me to call the supplier at 4 pm tomorrow",
  "Idea: build a free tier pricing experiment for leads",
  "Need to follow up with Rahul about the client proposal next week",
  "Business idea: create a WhatsApp-based capture assistant",
  "Send the Q4 financial summary to the board before Friday",
  "Schedule a meeting with the design team to review mockups",
  "What if we offered a referral program with tiered rewards?",
  "Ask accountant about GST filing deadline this quarter",
  "Book flights for the Toronto conference next month",
  "Need to handle the vendor invoice dispute before end of week",
];

type VoicePhase = "idle" | "recording" | "transcribing" | "editing" | "processing" | "done";

const DEST_LABELS: Record<string, { label: string; color: string }> = {
  today: { label: "Today", color: "text-[hsl(var(--brain-teal))]" },
  inbox: { label: "Inbox", color: "text-[hsl(var(--brain-amber))]" },
  ideas: { label: "Ideas Vault", color: "text-[hsl(var(--brain-purple))]" },
  maybe_later: { label: "Maybe Later", color: "text-muted-foreground" },
};

const QUICK_ACTIONS = [
  { label: "Voice Reminder", icon: Bell, hint: "remind me", color: "--brain-rose" },
  { label: "Voice Task", icon: ListChecks, hint: "need to", color: "--brain-teal" },
  { label: "Voice Idea", icon: Lightbulb, hint: "idea:", color: "--brain-amber" },
  { label: "Voice Follow-Up", icon: Users, hint: "follow up", color: "--brain-purple" },
  { label: "Brain Dump", icon: BrainCircuit, hint: "", color: "--brain-blue" },
];

export default function VoiceCapturePage() {
  const { captures, addCapture } = useBrain();
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [drivingMode, setDrivingMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [activeHint, setActiveHint] = useState("");

  const voiceCaptures = useMemo(
    () => captures.filter((c) => c.input_type === "voice").slice(0, 6),
    [captures]
  );

  const voiceToday = useMemo(
    () => captures.filter((c) => c.input_type === "voice" && (Date.now() - new Date(c.created_at).getTime()) < 86400000).length,
    [captures]
  );

  // Recording timer
  useEffect(() => {
    if (phase === "recording") {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const startRecording = useCallback((hint = "") => {
    setActiveHint(hint);
    setTranscript("");
    setPhase("recording");

    timeoutRef.current = setTimeout(() => {
      finishRecording(hint);
    }, drivingMode ? 3500 : 2500);
  }, [drivingMode]);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    finishRecording(activeHint);
  }, [activeHint]);

  const finishRecording = (hint: string) => {
    setPhase("transcribing");
    // Pick transcript — bias toward hint if provided
    let pool = VOICE_TRANSCRIPTS;
    if (hint) {
      const hinted = pool.filter((t) => t.toLowerCase().includes(hint.toLowerCase()));
      if (hinted.length > 0) pool = hinted;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const words = chosen.split(" ");
    let current = "";
    words.forEach((word, i) => {
      setTimeout(() => {
        current += (i === 0 ? "" : " ") + word;
        setTranscript(current);
        if (i === words.length - 1) {
          setTimeout(() => setPhase("editing"), 300);
        }
      }, i * 70);
    });
  };

  const handleSave = useCallback(() => {
    const trimmed = transcript.trim();
    if (!trimmed || phase !== "editing") return;
    setPhase("processing");
    setTimeout(() => {
      addCapture(trimmed, "voice");
      setPhase("done");
      toast.success("Voice capture saved.", { description: "Organized and ready in your Inbox." });
      setTimeout(() => {
        setPhase("idle");
        setTranscript("");
      }, drivingMode ? 1500 : 1000);
    }, 1200);
  }, [transcript, phase, addCapture, drivingMode]);

  const handleDiscard = () => {
    setPhase("idle");
    setTranscript("");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (drivingMode) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8 px-4">
        {/* Driving mode header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Driving Mode</h1>
          </div>
          <p className="text-sm text-muted-foreground">Hands-free friendly capture for moments on the move.</p>
        </div>

        {/* Large mic */}
        <button
          onClick={phase === "recording" ? stopRecording : phase === "idle" ? () => startRecording() : undefined}
          disabled={phase === "processing" || phase === "done"}
          className={`relative h-36 w-36 rounded-full flex items-center justify-center transition-all ${
            phase === "recording"
              ? "bg-destructive text-destructive-foreground scale-110"
              : phase === "processing" || phase === "done"
                ? "bg-primary/20 text-primary"
                : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
          }`}
        >
          {phase === "recording" && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping bg-destructive/30" />
              <span className="absolute inset-[-8px] rounded-full animate-pulse bg-destructive/10" />
            </>
          )}
          {phase === "recording" ? <Square className="h-12 w-12" /> :
            phase === "processing" ? <Sparkles className="h-12 w-12 animate-pulse" /> :
              phase === "done" ? <Check className="h-12 w-12" /> :
                <Mic className="h-12 w-12" />}
        </button>

        {/* Status text - large for driving */}
        <div className="text-center space-y-1">
          {phase === "idle" && <p className="text-xl font-semibold">Tap to Speak</p>}
          {phase === "recording" && (
            <div className="space-y-1">
              <p className="text-xl font-semibold text-destructive">Listening… {formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground">Tap to stop</p>
            </div>
          )}
          {phase === "transcribing" && <p className="text-xl font-semibold text-primary animate-pulse">Transcribing…</p>}
          {phase === "processing" && <p className="text-xl font-semibold text-primary animate-pulse">AI is organizing…</p>}
          {phase === "done" && <p className="text-xl font-semibold text-[hsl(var(--brain-teal))]">✓ Saved</p>}
        </div>

        {/* Transcript - large */}
        {(phase === "transcribing" || phase === "editing") && transcript && (
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 text-center">
            <p className="text-lg leading-relaxed">"{transcript}"</p>
          </div>
        )}

        {/* Save/Discard - large buttons */}
        {phase === "editing" && (
          <div className="flex gap-4">
            <Button size="lg" onClick={handleSave} className="gap-2 text-base px-8">
              <Check className="h-5 w-5" /> Save
            </Button>
            <Button size="lg" variant="outline" onClick={handleDiscard} className="text-base px-8">
              Discard
            </Button>
          </div>
        )}

        {/* Exit driving mode */}
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDrivingMode(false)}>
          Exit Driving Mode
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Capture</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture thoughts instantly when typing is not possible.
          </p>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={() => setDrivingMode(true)}>
          <Car className="h-4 w-4" /> Driving Mode
        </Button>
      </div>

      {/* Main Voice Panel */}
      <section className="rounded-2xl border bg-card shadow-sm p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Mic button */}
          <button
            onClick={phase === "recording" ? stopRecording : phase === "idle" ? () => startRecording() : undefined}
            disabled={phase === "processing" || phase === "done"}
            className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
              phase === "recording"
                ? "bg-destructive text-destructive-foreground scale-110"
                : phase === "processing" || phase === "done"
                  ? "bg-primary/20 text-primary"
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95 hover:shadow-xl"
            }`}
          >
            {phase === "recording" && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-destructive/30" />
                <span className="absolute inset-[-6px] rounded-full animate-pulse bg-destructive/10" />
              </>
            )}
            {phase === "recording" ? <Square className="h-8 w-8" /> :
              phase === "processing" ? <Sparkles className="h-8 w-8 animate-pulse" /> :
                phase === "done" ? <Check className="h-8 w-8" /> :
                  <Mic className="h-8 w-8" />}
          </button>

          {/* Status */}
          {phase === "idle" && (
            <div className="text-center space-y-1">
              <p className="text-base font-semibold">Tap to Speak</p>
              <p className="text-xs text-muted-foreground">Speak naturally. AI will organize it for you.</p>
            </div>
          )}
          {phase === "recording" && (
            <div className="text-center space-y-1">
              <div className="flex items-center gap-2 justify-center">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                </span>
                <p className="text-base font-semibold text-destructive">Listening… {formatTime(recordingTime)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Tap the button to stop</p>
            </div>
          )}
          {phase === "transcribing" && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-sm font-medium text-primary">Transcribing…</p>
            </div>
          )}
          {phase === "processing" && (
            <div className="flex items-center gap-2 animate-pulse">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">AI is organizing your thought…</p>
            </div>
          )}
          {phase === "done" && (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
              <p className="text-sm font-medium text-[hsl(var(--brain-teal))]">Saved to Inbox</p>
            </div>
          )}

          {/* Transcript preview */}
          {(phase === "transcribing" || phase === "editing") && transcript && (
            <div className="w-full rounded-xl border bg-secondary/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transcript</p>
                  <Badge variant="outline" className="text-[10px] gap-1 border-[hsl(var(--brain-purple))/0.3] text-[hsl(var(--brain-purple))]">
                    <Mic className="h-2.5 w-2.5" /> Voice
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Confidence: <span className="font-semibold text-[hsl(var(--brain-teal))]">High</span>
                </span>
              </div>
              {phase === "editing" ? (
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full text-sm leading-relaxed bg-transparent border-0 outline-none resize-none min-h-[60px]"
                />
              ) : (
                <p className="text-sm leading-relaxed italic">"{transcript}"</p>
              )}
            </div>
          )}

          {/* Actions */}
          {phase === "editing" && (
            <div className="flex gap-3">
              <Button onClick={handleSave} className="gap-1.5">
                <Check className="h-4 w-4" /> Save Capture
              </Button>
              <Button variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Quick Voice Actions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Voice Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => startRecording(action.hint)}
              disabled={phase !== "idle"}
              className="rounded-xl border bg-card p-4 space-y-2 text-center hover:shadow-md transition-all hover:border-primary/20 disabled:opacity-50"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto"
                style={{ background: `hsl(var(${action.color}) / 0.12)` }}
              >
                <action.icon className="h-5 w-5" style={{ color: `hsl(var(${action.color}))` }} />
              </div>
              <p className="text-xs font-medium">{action.label}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Driving Mode Card */}
      <section>
        <div
          onClick={() => setDrivingMode(true)}
          className="rounded-xl border bg-card p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Driving Mode</h3>
            <p className="text-xs text-muted-foreground">
              Simplified, distraction-free capture with large controls. Safe for hands-free use.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </section>

      {/* Recent Voice Captures */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Voice Captures</h2>
        </div>
        {voiceCaptures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <Mic className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No voice captures yet.</p>
            <p className="text-xs text-muted-foreground/70">Tap the mic above to capture your first thought.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {voiceCaptures.map((c) => {
              const ai = c.ai_data;
              if (!ai) return null;
              const dest = DEST_LABELS[ai.destination_suggestion];
              return (
                <div key={c.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] gap-1 border-[hsl(var(--brain-purple))/0.3] text-[hsl(var(--brain-purple))]">
                          <Mic className="h-2.5 w-2.5" /> Voice
                        </Badge>
                        {c.review_status === "auto_approved" && (
                          <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--brain-teal))] font-medium">
                            <ShieldCheck className="h-3 w-3" /> Auto-Approved
                          </span>
                        )}
                        {c.review_status === "needs_review" && c.status === "unprocessed" && (
                          <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--brain-amber))] font-medium">
                            <ShieldQuestion className="h-3 w-3" /> Needs Review
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium">{ai.title}</p>
                      <p className="text-xs text-muted-foreground italic mt-0.5">"{c.raw_input}"</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {dest && <p className={`text-[10px] font-medium ${dest.color}`}>→ {dest.label}</p>}
                      {ai.suggested_project && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                          <FolderOpen className="h-2.5 w-2.5" /> {ai.suggested_project}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
