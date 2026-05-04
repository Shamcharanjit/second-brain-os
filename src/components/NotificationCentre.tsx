/**
 * NotificationCentre
 *
 * Bell icon with badge count shown in the sidebar/header.
 * Two sources merged:
 *   1. Live workspace alerts (stalled projects, review pending, ai-review)
 *   2. Persisted in-app notifications from public.in_app_notifications
 *      (morning brief, inbox overflow, streak alerts sent by the cron)
 *
 * Clicking the bell opens a popover with the full list.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BrainCircuit, FolderKanban, RotateCcw, AlertTriangle,
  CheckCircle2, X, Sun, Inbox, Flame,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
  id:       string;
  source:   "live" | "db";
  icon:     React.ComponentType<{ className?: string }>;
  iconColor: string;
  title:    string;
  body:     string;
  cta:      string;
  to:       string;
  is_read:  boolean;
}

// Map DB notification types to icons / colours
function dbTypeIcon(type: string): { Icon: React.ComponentType<{ className?: string }>; color: string } {
  switch (type) {
    case "streak":  return { Icon: Flame,    color: "text-orange-500" };
    case "inbox":   return { Icon: Inbox,    color: "text-blue-500" };
    case "reminder":return { Icon: Sun,      color: "text-amber-500" };
    default:        return { Icon: Bell,     color: "text-primary" };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationCentre() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { captures } = useBrain();
  const { projects, getProjectHealth } = useProjects();
  const { dailyDoneToday } = useReviewMeta();
  const { notifications: dbNotifs, unreadCount: dbUnread, markRead, markAllRead } = useInAppNotifications();

  // ── Live workspace alerts ─────────────────────────────────────────────────
  const liveAlerts = useMemo((): Notification[] => {
    const list: Notification[] = [];

    const needsReview = captures.filter(
      (c) => c.review_status === "needs_review" && c.status !== "archived",
    ).length;
    if (needsReview > 0) {
      list.push({
        id: "needs_review", source: "live",
        icon: BrainCircuit, iconColor: "text-[hsl(var(--brain-amber))]",
        title: `${needsReview} capture${needsReview > 1 ? "s" : ""} need review`,
        body: "AI flagged these for your attention before they're routed.",
        cta: "Review now", to: "/ai-review", is_read: false,
      });
    }

    const stalledProjects = projects.filter(
      (p) => p.status === "active" && getProjectHealth(p) === "stalled",
    );
    if (stalledProjects.length > 0) {
      list.push({
        id: "stalled_projects", source: "live",
        icon: FolderKanban, iconColor: "text-destructive",
        title: `${stalledProjects.length} project${stalledProjects.length > 1 ? "s" : ""} stalled`,
        body: stalledProjects.length === 1
          ? `"${stalledProjects[0].name}" has had no activity.`
          : `${stalledProjects.slice(0, 2).map((p) => `"${p.name}"`).join(", ")} and more need attention.`,
        cta: "View projects", to: "/projects", is_read: false,
      });
    }

    const atRisk = projects.filter(
      (p) => p.status === "active" && getProjectHealth(p) === "at_risk",
    );
    if (atRisk.length > 0 && stalledProjects.length === 0) {
      list.push({
        id: "at_risk_projects", source: "live",
        icon: AlertTriangle, iconColor: "text-[hsl(var(--brain-amber))]",
        title: `${atRisk.length} project${atRisk.length > 1 ? "s" : ""} at risk`,
        body: "These projects are missing next actions or going quiet.",
        cta: "Review projects", to: "/projects", is_read: false,
      });
    }

    if (!dailyDoneToday) {
      list.push({
        id: "daily_review", source: "live",
        icon: RotateCcw, iconColor: "text-primary",
        title: "Daily review pending",
        body: "Take 2 minutes to clear your inbox and plan your day.",
        cta: "Start review", to: "/review", is_read: false,
      });
    }

    return list.filter((n) => !dismissed.has(n.id));
  }, [captures, projects, getProjectHealth, dailyDoneToday, dismissed]);

  // ── DB notifications (unread only shown in badge; all shown in panel) ─────
  const dbAlerts = useMemo((): Notification[] =>
    dbNotifs.slice(0, 10).map((n) => {
      const { Icon, color } = dbTypeIcon(n.type);
      return {
        id:        n.id,
        source:    "db" as const,
        icon:      Icon,
        iconColor: color,
        title:     n.title,
        body:      n.body ?? "",
        cta:       "View",
        to:        n.link ?? "/",
        is_read:   n.is_read,
      };
    }),
  [dbNotifs]);

  const allNotifications = [...liveAlerts, ...dbAlerts];
  const unreadCount = liveAlerts.length + dbUnread;

  const handleDismissLive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleClickNotif = (n: Notification) => {
    if (n.source === "db" && !n.is_read) markRead(n.id);
    navigate(n.to);
    setOpen(false);
  };

  const handleDismissAll = () => {
    setDismissed(new Set(liveAlerts.map((n) => n.id)));
    markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center h-8 w-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent side="right" align="end" sideOffset={8} className="w-80 p-0 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* List */}
        {allNotifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
            <p className="text-xs text-muted-foreground/60">No pending alerts right now.</p>
          </div>
        ) : (
          <div className="divide-y max-h-[380px] overflow-y-auto">
            {allNotifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group cursor-pointer ${
                  n.source === "db" && !n.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleClickNotif(n)}
              >
                {/* Unread dot */}
                {n.source === "db" && !n.is_read && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
                <div className="mt-0.5 shrink-0">
                  <n.icon className={`h-4 w-4 ${n.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-primary font-medium">{n.cta} →</p>
                </div>
                {n.source === "live" && (
                  <button
                    onClick={(e) => handleDismissLive(n.id, e)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50">Live from your workspace</p>
          {unreadCount > 0 && (
            <button
              onClick={handleDismissAll}
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
