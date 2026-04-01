import { useState } from "react";
import { useMemory } from "@/context/MemoryContext";
import { MemoryType } from "@/types/memory";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const TYPE_LABELS: Record<MemoryType, string> = {
  note: "Note", insight: "Insight", decision: "Decision", reference: "Reference",
  learning: "Learning", quote: "Quote", research: "Research", sop: "SOP",
};

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultText?: string;
  defaultType?: MemoryType;
  sourceCaptureId?: string;
}

export default function CreateMemoryDialog({ open, onClose, defaultTitle = "", defaultText = "", defaultType = "note", sourceCaptureId }: Props) {
  const { createMemory } = useMemory();
  const [title, setTitle] = useState(defaultTitle);
  const [text, setText] = useState(defaultText);
  const [summary, setSummary] = useState("");
  const [type, setType] = useState<MemoryType>(defaultType);
  const [tags, setTags] = useState("");
  const [score, setScore] = useState(50);

  const handleCreate = () => {
    if (!title.trim()) return;
    createMemory({
      title: title.trim(), raw_text: text.trim() || title.trim(),
      summary: summary.trim() || text.trim() || title.trim(),
      memory_type: type, tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      importance_score: score, source_capture_id: sourceCaptureId,
    });
    toast.success("Memory created");
    setTitle(""); setText(""); setSummary(""); setType("note"); setTags(""); setScore(50);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Memory</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input placeholder="What's worth remembering?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Content</label>
            <Textarea placeholder="Full text, context, or details..." value={text} onChange={(e) => setText(e.target.value)} className="min-h-[60px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Summary (optional)</label>
            <Input placeholder="One-line summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Importance</label>
              <Input type="number" min={1} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <Input placeholder="e.g. strategy, finance, product" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <Button className="w-full gap-1.5" onClick={handleCreate} disabled={!title.trim()}>
            <Plus className="h-4 w-4" /> Save Memory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
