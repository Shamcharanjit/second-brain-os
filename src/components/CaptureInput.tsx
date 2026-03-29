import { useState, useRef } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { Button } from "@/components/ui/button";

export default function CaptureInput() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const { addCapture } = useBrain();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addCapture(trimmed, "text");
    setText("");
    inputRef.current?.focus();
  };

  const handleVoice = () => {
    if (recording) {
      setRecording(false);
      // Mock voice capture
      addCapture("Voice note: Quick reminder to review project timeline", "voice");
    } else {
      setRecording(true);
      // Auto-stop after 3s for demo
      setTimeout(() => {
        setRecording(false);
        addCapture("Voice note: Quick reminder to review project timeline", "voice");
      }, 3000);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="What's on your mind?"
        className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button
        size="icon"
        variant={recording ? "destructive" : "ghost"}
        onClick={handleVoice}
        className="shrink-0"
      >
        {recording ? <MicOff className="h-4 w-4 animate-pulse-soft" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button size="icon" onClick={handleSubmit} disabled={!text.trim()} className="shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
