/**
 * NotificationPreferencesSection
 *
 * Replaces the basic PushNotificationToggle in Settings with a full
 * notification control panel:
 *   - Push enable/disable
 *   - Per-type toggles (morning brief, due today, daily review,
 *     inbox overflow, streak alert)
 *   - Time pickers for morning & evening windows
 *   - Inbox overflow threshold
 */

import { useEffect, useState } from "react";
import {
  Bell, BellOff, BellRing, Loader2, ExternalLink,
  Sun, Moon, Inbox, Flame, RotateCcw, CalendarCheck, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// ── Sub-row for a single notification type ────────────────────────────────────

function PrefRow({
  icon: Icon,
  iconColor,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}

// ── Hour picker ───────────────────────────────────────────────────────────────

function HourPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (h: number) => void;
  disabled?: boolean;
}) {
  function fmt(h: number) {
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${ampm}`;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{fmt(i)}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationPreferencesSection() {
  const { user } = useAuth();
  const { state, subscribe, unsubscribe } = usePushNotifications();
  const { prefs, loading, saving, savePrefs } = useNotificationPreferences();

  const [localPrefs, setLocalPrefs] = useState(prefs);
  const [dirty, setDirty]           = useState(false);

  // Sync when loaded
  useEffect(() => { setLocalPrefs(prefs); }, [prefs]);

  if (state === "unsupported" || !user) return null;

  function update<K extends keyof typeof prefs>(key: K, val: typeof prefs[K]) {
    setLocalPrefs((p) => ({ ...p, [key]: val }));
    setDirty(true);
  }

  async function handleSave() {
    const ok = await savePrefs(localPrefs);
    if (ok) { toast.success("Notification preferences saved."); setDirty(false); }
    else toast.error("Couldn't save preferences.");
  }

  const isSubscribed = state === "subscribed";

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) toast.success("Push notifications enabled!");
    else if (Notification.permission === "denied")
      toast.error("Notifications are blocked — update your browser settings.");
    else
      toast.error("Couldn't enable notifications.");
  };

  const handleDisable = async () => {
    await unsubscribe();
    toast.success("Push notifications disabled.");
  };

  return (
    <div className="space-y-5">

      {/* Push toggle row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 mt-0.5 ${isSubscribed ? "bg-primary/10" : "bg-muted"}`}>
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isSubscribed ? (
              <BellRing className="h-4 w-4 text-primary" />
            ) : state === "denied" ? (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isSubscribed ? "Push notifications enabled" : "Enable push notifications"}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              {isSubscribed
                ? "You'll receive smart reminders based on your preferences below."
                : state === "denied"
                ? "Notifications are blocked in your browser settings."
                : "Get smart reminders for reviews, captures, tasks and more."}
            </p>
            {state === "denied" && (
              <a
                href="https://support.google.com/chrome/answer/3220216"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1"
              >
                How to unblock notifications <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {state === "loading" ? null : isSubscribed ? (
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleDisable}>
              <BellOff className="h-3 w-3" /> Disable
            </Button>
          ) : state !== "denied" ? (
            <Button size="sm" className="text-xs h-8 gap-1.5" onClick={handleEnable}>
              <Bell className="h-3 w-3" /> Enable
            </Button>
          ) : null}
        </div>
      </div>

      {/* Per-type preferences — only shown when subscribed */}
      {isSubscribed && !loading && (
        <>
          <div className="rounded-xl border bg-muted/20 divide-y overflow-hidden">

            {/* Morning section header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Morning</span>
            </div>

            <div className="px-4">
              <PrefRow
                icon={Sun}
                iconColor="text-amber-500"
                label="Morning Brief"
                description="A daily summary of your tasks and inbox count when you wake up."
                value={localPrefs.morning_brief}
                onChange={(v) => update("morning_brief", v)}
              />
              <PrefRow
                icon={CalendarCheck}
                iconColor="text-green-500"
                label="Due Today"
                description="Reminder of tasks pinned to today's list."
                value={localPrefs.due_today}
                onChange={(v) => update("due_today", v)}
              />
            </div>

            {/* Afternoon section */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Afternoon</span>
            </div>

            <div className="px-4">
              <PrefRow
                icon={RotateCcw}
                iconColor="text-primary"
                label="Daily Review"
                description="Nudge at 2pm when your daily review isn't done yet."
                value={localPrefs.daily_review}
                onChange={(v) => update("daily_review", v)}
              />
            </div>

            {/* Evening section */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evening</span>
            </div>

            <div className="px-4">
              <PrefRow
                icon={Flame}
                iconColor="text-orange-500"
                label="Streak Alert"
                description="Alert if you haven't captured anything in 24 hours."
                value={localPrefs.streak_alert}
                onChange={(v) => update("streak_alert", v)}
              />
              <PrefRow
                icon={Inbox}
                iconColor="text-blue-500"
                label="Inbox Overflow"
                description={`Alert when your inbox exceeds ${localPrefs.inbox_threshold} uncategorised items.`}
                value={localPrefs.inbox_overflow}
                onChange={(v) => update("inbox_overflow", v)}
              />
            </div>
          </div>

          {/* Timing & threshold */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timing</p>
            <HourPicker
              label="Morning reminder hour"
              value={localPrefs.morning_hour}
              onChange={(v) => update("morning_hour", v)}
            />
            <HourPicker
              label="Evening reminder hour"
              value={localPrefs.evening_hour}
              onChange={(v) => update("evening_hour", v)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Inbox overflow threshold</span>
              <select
                value={localPrefs.inbox_threshold}
                onChange={(e) => update("inbox_threshold", Number(e.target.value))}
                className="rounded-lg border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {[3, 5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n} items</option>
                ))}
              </select>
            </div>
          </div>

          {/* Save button */}
          {dirty && (
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Save preferences
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
