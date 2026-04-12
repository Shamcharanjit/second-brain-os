import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Mic, MicOff, Square, Check, Sparkles, Car, Clock,
  ArrowRight, FolderOpen, ShieldCheck, ShieldQuestion,
  Lightbulb, ListChecks, Bell, Users, BrainCircuit, Volume2,
  AlertTriangle,
} from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSpeechRecognition, type SpeechState } from "@/hooks/useSpeechRecognition";

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
  const [drivingMode, setDrivingMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Editable transcript shown after recognition completes
  const [editableTranscript, setEditableTranscript] = useState("");
  // Whether we're in the editing phase (post-recognition, pre-save)
  const [editing, setEditing] = useState(false);
  // Whether we just saved
  const [saved, setSaved] = useState(false);

  // Ref to track driving mode inside callbacks without stale closure
  const drivingModeRef = useRef(drivingMode);
  useEffect(() => { drivingModeRef.current = drivingMode; }, [drivingMode]);

  // Flag to prevent duplicate saves from both onResult and onEnd
  const savingRef = useRef(false);
  const speechResetRef = useRef<() => void>(() => {});

  const doSave = useCallback((transcript: string) => {
    if (savingRef.current) return;
    const trimmed = transcript.trim();
    if (!trimmed) return;
    savingRef.current = true;
    addCapture(trimmed, "voice");
    setSaved(true);
    setEditing(false);
    setEditableTranscript(trimmed);
    toast.success("Voice capture saved.", { description: "Organized and ready in your Inbox." });
    setTimeout(() => {
      setSaved(false);
      setEditableTranscript("");
      savingRef.current = false;
      speechResetRef.current();
    }, drivingModeRef.current ? 1500 : 1000);
  }, [addCapture]);

  const speech = useSpeechRecognition({
    minConfidence: 0.4,
    onResult: (transcript) => {
      if (drivingModeRef.current) {
        doSave(transcript);
      } else {
        setEditableTranscript(transcript);
        setEditing(true);
      }
    },
  });

  // Keep reset ref in sync
  useEffect(() => { speechResetRef.current = speech.reset; }, [speech.reset]);

  const voiceCaptures = useMemo(
    () => captures.filter((c) => c.input_type === "voice").slice(0, 6),
    [captures]
  );

  // Recording timer
  useEffect(() => {
    if (speech.state === "listening") {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [speech.state]);

  const startRecording = useCallback(async () => {
    setSaved(false);
    setEditing(false);
    setEditableTranscript("");
    await speech.startListening();
  }, [speech]);

  const stopRecording = useCallback(() => {
    speech.stopListening();
  }, [speech]);

  const handleSave = useCallback(() => {
    doSave(editableTranscript);
  }, [editableTranscript, doSave]);

  const startRecording = useCallback(async () => {
    setSaved(false);
    setEditing(false);
    setEditableTranscript("");
    savingRef.current = false;
    await speech.startListening();
  }, [speech]);

  const handleDiscard = useCallback(() => {
    setEditing(false);
    setEditableTranscript("");
    speech.reset();
  }, [speech]);

  const handleRetry = useCallback(() => {
    speech.reset();
    setEditing(false);
    setEditableTranscript("");
  }, [speech]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Derived display state
  const displayTranscript = editing ? editableTranscript : speech.interimTranscript;
  const isIdle = speech.state === "idle" && !editing && !saved;
  const isListening = speech.state === "listening";
  const isProcessing = speech.state === "processing" && !editing;
  const isError = speech.state === "error";
  const isUnsupported = speech.state === "unsupported";
  const canRecord = isIdle || isError;

  // ─── Driving Mode ───
  if (drivingMode) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8 px-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Driving Mode</h1>
          </div>
          <p className="text-sm text-muted-foreground">Hands-free friendly capture for moments on the move.</p>
        </div>

        {/* Large mic button */}
        <button
          onClick={isListening ? stopRecording : canRecord ? startRecording : undefined}
          disabled={saved || isProcessing || isUnsupported}
          className={`relative h-36 w-36 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? "bg-destructive text-destructive-foreground scale-110"
              : saved
                ? "bg-primary/20 text-primary"
                : isError
                  ? "bg-destructive/20 text-destructive"
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
          }`}
        >
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping bg-destructive/30" />
              <span className="absolute inset-[-8px] rounded-full animate-pulse bg-destructive/10" />
            </>
          )}
          {isListening ? <Square className="h-12 w-12" /> :
            isProcessing ? <Sparkles className="h-12 w-12 animate-pulse" /> :
              saved ? <Check className="h-12 w-12" /> :
                isError ? <AlertTriangle className="h-12 w-12" /> :
                  <Mic className="h-12 w-12" />}
        </button>

        {/* Status text */}
        <div className="text-center space-y-1">
          {isUnsupported && (
            <div className="space-y-1">
              <p className="text-xl font-semibold text-destructive">Not Supported</p>
              <p className="text-sm text-muted-foreground">Speech recognition is not available in this browser.</p>
            </div>
          )}
          {isIdle && <p className="text-xl font-semibold">Tap to Speak</p>}
          {isListening && (
            <div className="space-y-1">
              <p className="text-xl font-semibold text-destructive">Listening… {formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground">Tap to stop</p>
            </div>
          )}
          {isProcessing && <p className="text-xl font-semibold text-primary animate-pulse">Processing…</p>}
          {saved && <p className="text-xl font-semibold text-[hsl(var(--brain-teal))]">✓ Saved</p>}
          {isError && (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-destructive">{speech.errorMessage}</p>
              <p className="text-sm text-muted-foreground">Tap the button to try again</p>
            </div>
          )}
        </div>

        {/* Live interim preview */}
        {isListening && speech.interimTranscript && (
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 text-center">
            <p className="text-lg leading-relaxed text-muted-foreground italic">"{speech.interimTranscript}"</p>
          </div>
        )}

        {/* Editable transcript */}
        {editing && editableTranscript && (
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 text-center">
            <p className="text-lg leading-relaxed">"{editableTranscript}"</p>
          </div>
        )}

        {/* Save/Discard */}
        {editing && (
          <div className="flex gap-4">
            <Button size="lg" onClick={handleSave} className="gap-2 text-base px-8">
              <Check className="h-5 w-5" /> Save
            </Button>
            <Button size="lg" variant="outline" onClick={handleDiscard} className="text-base px-8">
              Discard
            </Button>
          </div>
        )}

        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDrivingMode(false)}>
          Exit Driving Mode
        </Button>
      </div>
    );
  }

  // ─── Normal Mode ───
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

      {/* Unsupported banner */}
      {isUnsupported && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Speech Recognition Unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your browser does not support the Web Speech API. Please use Chrome, Edge, or Safari for voice capture.
            </p>
          </div>
        </div>
      )}

      {/* Main Voice Panel */}
      <section className="rounded-2xl border bg-card shadow-sm p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Mic button */}
          <button
            onClick={isListening ? stopRecording : canRecord ? startRecording : undefined}
            disabled={saved || isProcessing || isUnsupported}
            className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isListening
                ? "bg-destructive text-destructive-foreground scale-110"
                : saved
                  ? "bg-primary/20 text-primary"
                  : isError
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                    : "bg-primary text-primary-foreground hover:scale-105 active:scale-95 hover:shadow-xl"
            }`}
          >
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-destructive/30" />
                <span className="absolute inset-[-6px] rounded-full animate-pulse bg-destructive/10" />
              </>
            )}
            {isListening ? <Square className="h-8 w-8" /> :
              isProcessing ? <Sparkles className="h-8 w-8 animate-pulse" /> :
                saved ? <Check className="h-8 w-8" /> :
                  isError ? <AlertTriangle className="h-8 w-8" /> :
                    <Mic className="h-8 w-8" />}
          </button>

          {/* Status */}
          {isIdle && (
            <div className="text-center space-y-1">
              <p className="text-base font-semibold">Tap to Speak</p>
              <p className="text-xs text-muted-foreground">Speak naturally. AI will organize it for you.</p>
            </div>
          )}
          {isListening && (
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
          {isProcessing && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-sm font-medium text-primary">Processing…</p>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[hsl(var(--brain-teal))]" />
              <p className="text-sm font-medium text-[hsl(var(--brain-teal))]">Saved to Inbox</p>
            </div>
          )}
          {isError && (
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-destructive">{speech.errorMessage}</p>
              <Button size="sm" variant="outline" onClick={handleRetry} className="mt-2 text-xs">
                Try Again
              </Button>
            </div>
          )}

          {/* Live interim transcript */}
          {isListening && speech.interimTranscript && (
            <div className="w-full rounded-xl border border-dashed bg-secondary/20 p-4">
              <p className="text-sm leading-relaxed italic text-muted-foreground">"{speech.interimTranscript}"</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Live preview — not yet saved</p>
            </div>
          )}

          {/* Editable transcript after recognition */}
          {editing && editableTranscript && (
            <div className="w-full rounded-xl border bg-secondary/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transcript</p>
                  <Badge variant="outline" className="text-[10px] gap-1 border-[hsl(var(--brain-purple))/0.3] text-[hsl(var(--brain-purple))]">
                    <Mic className="h-2.5 w-2.5" /> Voice
                  </Badge>
                </div>
                {speech.confidence > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Confidence: <span className={`font-semibold ${speech.confidence >= 0.8 ? "text-[hsl(var(--brain-teal))]" : speech.confidence >= 0.6 ? "text-[hsl(var(--brain-amber))]" : "text-destructive"}`}>
                      {speech.confidence >= 0.8 ? "High" : speech.confidence >= 0.6 ? "Medium" : "Low"}
                    </span>
                  </span>
                )}
              </div>
              <textarea
                value={editableTranscript}
                onChange={(e) => setEditableTranscript(e.target.value)}
                className="w-full text-sm leading-relaxed bg-transparent border-0 outline-none resize-none min-h-[60px]"
              />
            </div>
          )}

          {/* Actions */}
          {editing && (
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
              onClick={() => startRecording()}
              disabled={!canRecord || isUnsupported}
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
