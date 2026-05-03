/**
 * NotificationCentre
 *
 * Bell icon with badge count shown in the sidebar/header.
 * Generates in-app alerts from live data:
 *   - Captures needing AI review
 *   - Stalled / at-risk projects
 *   - Daily review not done yet today
 *
 * Clicking the bell opens a popover with the alert list.
 * Each alert has a CTA that navigates to the relevant page.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BrainCircuit, FolderKanban, RotateCcw, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";

interface Notification {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  body: string;
  cta: string;
  to: string;
}

export default function NotificationCentre() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const { dailyDoneToday } = useReviewMeta();

  const notifications = useMemo((): Notification[] => {
    const list: Notification[] = [];

    // 1. Captures needing review
    const needsReview = captures.filter(
      (c) => c.review_status === "needs_review" && c.status !== "archived"
    ).length;
    if (needsReview > 0) {
      list.push({
        id: "needs_review",
        icon: BrainCircuit,
        iconColor: "text-[hsl(var(--brain-amber))]",
        title: `${needsReview} capture${needsReview > 1 ? "s" : ""} need review`,
        body: "AI flagged these for your attention before they're routed.",
        cta: "Review now",
        to: "/ai-review",
      });
    }

    // 2. Stalled projects
    const stalledProjects = projects.filter(
      (p) => p.status === "active" && getProjectHealth(p) === "stalled"
    );
    if (stalledProjects.length > 0) {
      list.push({
        id: "stalled_projects",
        icon: FolderKanban,
        iconColor: "text-destructive",
        title: `${stalledProjects.length} project${stalledProjects.length > 1 ? "s" : ""} stalled`,
        body: stalledProjects.length === 1
          ? `"${stalledProjects[0].name}" has had no activity.`
          : `${stalledProjects.map((p) => `"${p.name}"`).slice(0, 2).join(", ")} and more need attention.`,
        cta: "View projects",
        to: "/projects",
      });
    }

    // 3. At-risk projects
    const atRisk = projects.filter(
      (p) => p.status === "active" && getProjectHealth(p) === "at_risk"
    );
    if (atRisk.length > 0 && stalledProjects.length === 0) {
      list.push({
        id: "at_risk_projects",
        icon: AlertTriangle,
        iconColor: "text-[hsl(var(--brain-amber))]",
        title: `${atRisk.length} project${atRisk.length > 1 ? "s" : ""} at risk`,
        body: "These projects are missing next actions or going quiet.",
        cta: "Review projects",
        to: "/projects",
      });
    }

    // 4. Daily review not done
    if (!dailyDoneToday) {
      list.push({
        id: "daily_review",
        icon: RotateCcw,
        iconColor: "text-primary",
        title: "Daily review pending",
        body: "Take 2 minutes to clear your inbox and plan your day.",
        cta: "Start review",
        to: "/review",
      });
    }

    return list.filter((n) => !dismissed.has(n.id));
  }, [captures, projects, getProjectHealth, dailyDoneToday, dismissed]);

  const count = notifications.length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center h-8 w-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-white">{count}</span>
            )}
          </div>
        </div>

        {/* List */}
        {count === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
            <p className="text-xs text-muted-foreground/60">No pending alerts right now.</p>
          </div>
        ) : (
          <div className="divide-y max-h-[360px] overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group">
                <div className="mt-0.5 shrink-0">
                  <n.icon className={`h-4 w-4 ${n.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{n.body}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-primary hover:text-primary -ml-2 gap-1"
                    onClick={() => { navigate(n.to); setOpen(false); }}
                  >
                    {n.cta} →
                  </Button>
                </div>
                <button
                  onClick={(e) => handleDismiss(n.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50">Live from your workspace</p>
          {count > 0 && (
            <button
              onClick={() => setDismissed(new Set(notifications.map((n) => n.id)))}
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Dismiss all
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
