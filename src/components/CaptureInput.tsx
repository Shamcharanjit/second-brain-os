import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { Button } from "@/components/ui/button";

const VOICE_TRANSCRIPTS = [
  "Remind me to send the project update to the team by tomorrow",
  "Idea: build a weekly digest email for all captured thoughts",
  "Call the accountant about quarterly tax filing",
  "Follow up with design team about the new landing page mockups",
  "Maybe later: explore integrating calendar sync with this app",
  "Buy office supplies and restock printer paper today",
];

export default function CaptureInput() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const { addCapture } = useBrain();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addCapture(trimmed, "text");
    setText("");
    inputRef.current?.focus();
  };

  const handleVoice = () => {
    if (recording) {
      // Stop recording early
      if (timerRef.current) clearTimeout(timerRef.current);
      finishRecording();
    } else {
      setRecording(true);
      setText("");
      // Auto-stop after 2.5s
      timerRef.current = setTimeout(() => finishRecording(), 2500);
    }
  };

  const finishRecording = () => {
    setRecording(false);
    setTranscribing(true);

    const transcript = VOICE_TRANSCRIPTS[Math.floor(Math.random() * VOICE_TRANSCRIPTS.length)];

    // Simulate transcript appearing word by word
    const words = transcript.split(" ");
    let current = "";
    words.forEach((word, i) => {
      setTimeout(() => {
        current += (i === 0 ? "" : " ") + word;
        setText(current);
        if (i === words.length - 1) {
          // Auto-submit after brief pause
          setTimeout(() => {
            addCapture(transcript, "voice");
            setText("");
            setTranscribing(false);
          }, 600);
        }
      }, i * 80);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-sm transition-colors focus-within:border-primary/40">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={recording ? "" : "What's on your mind?"}
          disabled={recording || transcribing}
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <Button
          size="icon"
          variant={recording ? "destructive" : "ghost"}
          onClick={handleVoice}
          disabled={transcribing}
          className="shrink-0"
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button size="icon" onClick={handleSubmit} disabled={!text.trim() || recording || transcribing} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {recording && (
        <div className="flex items-center gap-2 px-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
          </span>
          <span className="text-xs text-destructive font-medium">Listening…</span>
        </div>
      )}
      {transcribing && !recording && (
        <div className="flex items-center gap-2 px-3">
          <span className="text-xs text-muted-foreground font-medium">Transcribing…</span>
        </div>
      )}
    </div>
  );
}
