import { useState } from "react";
import { useProjects } from "@/context/ProjectContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Project } from "@/types/project";
import { callProjectAssist, isProjectAIAvailable, type ProjectAIResult, type SuggestNextStepResult, type BreakIntoStepsResult, type FindBlockerResult } from "@/lib/ai-project";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, Zap, Layers, AlertTriangle, Loader2, Plus, Check, Crown,
} from "lucide-react";

interface Props {
  project: Project;
}

export default function ProjectAIAssist({ project }: Props) {
  const { addNextAction, addNote } = useProjects();
  const { canUseAITriage, isPro, recordAITriageUse, aiTriageRemaining } = useSubscription();

  const [loading, setLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ProjectAIResult | null>(null);
  const [appliedSteps, setAppliedSteps] = useState<Set<number>>(new Set());

  const available = isProjectAIAvailable();
  const activeActions = project.next_actions.filter((a) => !a.is_completed).map((a) => a.text);

  const handleAction = async (action: "suggest_next_step" | "break_into_steps" | "find_blocker") => {
    if (!canUseAITriage) {
      toast.error("AI limit reached for today.", {
        description: "Upgrade to Pro for more AI-powered features.",
        action: { label: "Upgrade", onClick: () => window.location.href = "/upgrade" },
      });
      return;
    }

    setLoading(action);
    setLastResult(null);
    setAppliedSteps(new Set());

    try {
      const result = await callProjectAssist(action, project.name, project.description, activeActions);
      recordAITriageUse();
      setLastResult(result);
    } catch (err: any) {
      toast.error(err.message || "AI request failed");
    } finally {
      setLoading(null);
    }
  };

  const handleApplyNextStep = (text: string) => {
    addNextAction(project.id, text, activeActions.length === 0);
    toast.success("Action added to project");
    setLastResult(null);
  };

  const handleApplyStep = (text: string, idx: number) => {
    addNextAction(project.id, text, idx === 0 && activeActions.length === 0);
    setAppliedSteps((prev) => new Set(prev).add(idx));
    toast.success("Step added");
  };

  const handleApplyAllSteps = (steps: Array<{ step: string }>) => {
    steps.forEach((s, i) => {
      if (!appliedSteps.has(i)) {
        addNextAction(project.id, s.step, i === 0 && activeActions.length === 0);
      }
    });
    toast.success("All steps added to project");
    setLastResult(null);
  };

  const handleSaveBlocker = (blocker: string, suggestion: string) => {
    addNote(project.id, `⚠️ Likely blocker: ${blocker}\n💡 Suggestion: ${suggestion}`);
    toast.success("Blocker insight saved to project notes");
    setLastResult(null);
  };

  if (!available) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Project Assist
        {!isPro && (
          <Badge variant="secondary" className="text-[9px] gap-0.5 ml-1">
            <Crown className="h-2.5 w-2.5" /> {aiTriageRemaining} left
          </Badge>
        )}
      </h3>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm" variant="outline"
          className="text-xs gap-1.5 h-7"
          onClick={() => handleAction("suggest_next_step")}
          disabled={!!loading}
        >
          {loading === "suggest_next_step" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Suggest Next Step
        </Button>
        <Button
          size="sm" variant="outline"
          className="text-xs gap-1.5 h-7"
          onClick={() => handleAction("break_into_steps")}
          disabled={!!loading}
        >
          {loading === "break_into_steps" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
          Break Into 3 Steps
        </Button>
        <Button
          size="sm" variant="outline"
          className="text-xs gap-1.5 h-7"
          onClick={() => handleAction("find_blocker")}
          disabled={!!loading}
        >
          {loading === "find_blocker" ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
          Find Blocker
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 px-1 animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">AI is thinking…</span>
        </div>
      )}

      {/* Results */}
      {lastResult && lastResult.action === "suggest_next_step" && (
        <div className="rounded-xl border bg-primary/5 border-primary/15 p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested Next Step</span>
          </div>
          <p className="text-sm font-medium">{(lastResult.result as SuggestNextStepResult).next_step}</p>
          <p className="text-xs text-muted-foreground">{(lastResult.result as SuggestNextStepResult).reasoning}</p>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => handleApplyNextStep((lastResult.result as SuggestNextStepResult).next_step)}>
            <Plus className="h-3 w-3" /> Add as Next Action
          </Button>
        </div>
      )}

      {lastResult && lastResult.action === "break_into_steps" && (
        <div className="rounded-xl border bg-primary/5 border-primary/15 p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">3-Step Breakdown</span>
            </div>
            <Button size="sm" variant="outline" className="text-xs gap-1 h-6" onClick={() => handleApplyAllSteps((lastResult.result as BreakIntoStepsResult).steps)}>
              <Plus className="h-3 w-3" /> Add All
            </Button>
          </div>
          <div className="space-y-2">
            {(lastResult.result as BreakIntoStepsResult).steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-primary mt-0.5 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{s.step}</p>
                  <Badge variant="secondary" className="text-[9px] mt-0.5">{s.priority}</Badge>
                </div>
                {appliedSteps.has(i) ? (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => handleApplyStep(s.step, i)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lastResult && lastResult.action === "find_blocker" && (
        <div className="rounded-xl border bg-destructive/5 border-destructive/15 p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Likely Blocker</span>
          </div>
          <p className="text-sm font-medium">{(lastResult.result as FindBlockerResult).blocker}</p>
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Suggestion:</span> {(lastResult.result as FindBlockerResult).suggestion}</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleSaveBlocker((lastResult.result as FindBlockerResult).blocker, (lastResult.result as FindBlockerResult).suggestion)}>
            <Plus className="h-3 w-3" /> Save to Project Notes
          </Button>
        </div>
      )}
    </div>
  );
}
