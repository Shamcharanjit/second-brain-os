import { useState } from "react";
import { useProjects } from "@/context/ProjectContext";
import { ProjectPriority } from "@/types/project";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultDescription?: string;
  sourceIdeaId?: string;
  /** AI-suggested first next action — auto-added on creation */
  initialNextAction?: string;
}

export default function CreateProjectDialog({ open, onClose, defaultName = "", defaultDescription = "", sourceIdeaId, initialNextAction }: Props) {
  const { createProject, addNextAction, linkCapture } = useProjects();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [priority, setPriority] = useState<ProjectPriority>("medium");

  const handleCreate = () => {
    if (!name.trim()) return;
    const proj = createProject(name.trim(), description.trim(), priority, sourceIdeaId);

    // Auto-add AI suggested next action if available and meaningful
    if (initialNextAction?.trim() && initialNextAction.trim().toLowerCase() !== name.trim().toLowerCase()) {
      addNextAction(proj.id, initialNextAction.trim(), true);
    }

    // Link source capture if provided
    if (sourceIdeaId) {
      linkCapture(proj.id, sourceIdeaId);
    }

    toast.success(initialNextAction?.trim() ? "Project created with first action" : "Project created");
    setName(""); setDescription(""); setPriority("medium");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Project Name</label>
            <Input placeholder="e.g., Launch Marketing Campaign" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea placeholder="What is this project about?" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
          </div>
          {initialNextAction?.trim() && (
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI-Suggested First Action</p>
              <p className="text-xs text-foreground">{initialNextAction}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full gap-1.5" onClick={handleCreate} disabled={!name.trim()}>
            <Plus className="h-4 w-4" /> Create Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
