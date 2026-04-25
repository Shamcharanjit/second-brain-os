/**
 * Day-2 Retention Loop — Follow-Up Reminder Card
 * ──────────────────────────────────────────────
 * Shown right after a high-signal capture (task / reminder / idea / high
 * priority). Friendly nudge: "Want InsightHalo to remind you about this
 * tomorrow?". Includes smart timing presets.
 */
import { useState } from "react";
import { Bell, Sunrise, Moon, CalendarClock, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  scheduleReminder,
  timingLabel,
  type ReminderTiming,
} from "@/lib/reminders";
import { logFunnelEvent } from "@/lib/activation-funnel";
import { useAuth } from "@/context/AuthContext";

interface FollowUpReminderCardProps {
  captureId: string;
  captureText: string;
  captureTitle: string | null;
  onDone: () => void;
}

export default function FollowUpReminderCard({
  captureId,
  captureText,
  captureTitle,
  onDone,
}: FollowUpReminderCardProps) {
  const { user } = useAuth();
  const [showSmart, setShowSmart] = useState(false);
  const [busy, setBusy] = useState(false);

  const schedule = (timing: ReminderTiming) => {
    if (busy) return;
    setBusy(true);
    try {
      const reminder = scheduleReminder({
        source_capture_id: captureId,
        source_text: captureText,
        source_title: captureTitle,
        timing,
      });

      // Log a funnel event so Growth Intelligence can correlate Day-2 return
      // intent with conversion lift. Fire-and-forget.
      if (user?.id) {
        logFunnelEvent("day2_retained", {
          userId: user.id,
          source: "reminder_scheduled",
          metadata: {
            timing,
            due_at: reminder.due_at,
            source_capture_id: captureId,
          },
        });
      }

      toast.success(`Got it — I'll bring this back ${timingLabel(timing).toLowerCase()}.`, {
        description: "InsightHalo will surface it in Today when it's time.",
      });
      onDone();
    } catch (err) {
      console.error("[FollowUpReminderCard] schedule failed:", err);
      toast.error("Couldn't set the reminder. Please try again.");
      setBusy(false);
    }
  };

  const dismiss = () => {
    if (busy) return;
    onDone();
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Want InsightHalo to remind you about this tomorrow?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            “{captureTitle || captureText}”
          </p>

          {!showSmart ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => schedule("tomorrow_morning")}
                disabled={busy}
                className="h-8 gap-1.5 text-xs"
              >
                <Check className="h-3.5 w-3.5" /> Remind me tomorrow
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSmart(true)}
                disabled={busy}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" /> Smart timing
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                disabled={busy}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                <X className="h-3.5 w-3.5" /> Not now
              </Button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SmartButton
                icon={<Sunrise className="h-3.5 w-3.5" />}
                label="Tomorrow AM"
                onClick={() => schedule("tomorrow_morning")}
                disabled={busy}
              />
              <SmartButton
                icon={<Moon className="h-3.5 w-3.5" />}
                label="Tonight"
                onClick={() => schedule("tonight")}
                disabled={busy}
              />
              <SmartButton
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="Next week"
                onClick={() => schedule("next_week")}
                disabled={busy}
              />
              <SmartButton
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="Custom later"
                onClick={() => schedule("custom")}
                disabled={busy}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                disabled={busy}
                className="col-span-2 sm:col-span-4 h-7 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Not now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SmartButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-8 justify-start gap-1.5 text-[11px]"
    >
      {icon} {label}
    </Button>
  );
}
