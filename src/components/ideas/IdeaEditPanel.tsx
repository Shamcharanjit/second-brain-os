import { useState } from "react";
import { Capture, AIProcessedData } from "@/types/brain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save } from "lucide-react";

interface Props {
  capture: Capture;
  onSave: (id: string, updates: Partial<AIProcessedData>) => void;
  onClose: () => void;
}

export default function IdeaEditPanel({ capture, onSave, onClose }: Props) {
  const ai = capture.ai_data!;
  const [title, setTitle] = useState(ai.title);
  const [summary, setSummary] = useState(ai.summary);
  const [priority, setPriority] = useState(ai.priority_score);
  const [nextAction, setNextAction] = useState(ai.next_action);
  const [tagInput, setTagInput] = useState(ai.tags.join(", "));

  const handleSave = () => {
    onSave(capture.id, {
      title,
      summary,
      priority_score: priority,
      next_action: nextAction,
      tags: tagInput.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-card p-5 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit Idea</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Summary</label>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} className="h-8 text-sm mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Potential (1–100)</label>
            <Input type="number" min={1} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next Action</label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="h-8 text-sm mt-1" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="h-8 text-sm mt-1" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
          <Save className="h-3 w-3" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
