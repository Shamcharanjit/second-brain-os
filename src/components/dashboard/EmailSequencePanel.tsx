/**
 * EmailSequencePanel
 *
 * Shows the health of the retention email sequence across
 * day-1, day-2 and day-7 touchpoints. Queries activation_funnel_events
 * to show send counts, open rates (future), and next-run queue size.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Mail, RefreshCw, Clock, CheckCircle2, Users, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subHours, isAfter, format } from "date-fns";

type EventRow = {
  event_type: string;
  waitlist_signup_email: string;
  created_at: string;
};

type WaitlistRow = {
  email: string;
  name: string;
  status: string;
  activation_completed_at: string | null;
};

type SequenceStep = {
  key: string;
  label: string;
  window: string;
  eventType: string;
  windowHoursStart: number;
  windowHoursEnd: number;
  sent: number;
  inQueue: number;
  color: string;
};

export default function EmailSequencePanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [evRes, wlRes] = await Promise.all([
      supabase
        .from("activation_funnel_events" as any)
        .select("event_type, waitlist_signup_email, created_at")
        .in("event_type", ["reengagement_email_sent", "day2_email_sent", "day7_email_sent"]),
      supabase
        .from("waitlist_signups" as any)
        .select("email, name, status, activation_completed_at")
        .eq("status", "activated"),
    ]);

    setEvents((evRes.data as any as EventRow[]) || []);
    setWaitlist((wlRes.data as any as WaitlistRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const now = new Date();

  const buildStep = (
    key: string,
    label: string,
    window: string,
    eventType: string,
    windowHoursStart: number,
    windowHoursEnd: number,
    color: string,
  ): SequenceStep => {
    const sent = events.filter((e) => e.event_type === eventType).length;

    // In queue = activated users whose activation_completed_at is within
    // the window bounds AND who haven't received this email yet
    const sentEmails = new Set(
      events.filter((e) => e.event_type === eventType).map((e) => e.waitlist_signup_email)
    );

    const windowStart = new Date(now.getTime() - windowHoursEnd * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() - windowHoursStart * 60 * 60 * 1000);

    const inQueue = waitlist.filter((w) => {
      if (!w.activation_completed_at) return false;
      if (sentEmails.has(w.email)) return false;
      const t = new Date(w.activation_completed_at);
      return t >= windowStart && t <= windowEnd;
    }).length;

    return { key, label, window, eventType, windowHoursStart, windowHoursEnd, sent, inQueue, color };
  };

  const steps: SequenceStep[] = [
    buildStep("day1", "Day 1", "20–28 h", "reengagement_email_sent", 20, 28, "text-[hsl(var(--brain-teal))]"),
    buildStep("day2", "Day 2", "44–52 h", "day2_email_sent",         44, 52, "text-[hsl(var(--brain-purple))]"),
    buildStep("day7", "Day 7", "160–172 h","day7_email_sent",         160, 172, "text-[hsl(var(--brain-amber))]"),
  ];

  const totalSent = steps.reduce((s, x) => s + x.sent, 0);
  const totalInQueue = steps.reduce((s, x) => s + x.inQueue, 0);

  // Recent sends (last 48h) for activity feed
  const recentCutoff = subHours(now, 48);
  const recentSends = events
    .filter((e) => isAfter(new Date(e.created_at), recentCutoff))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const eventLabels: Record<string, string> = {
    reengagement_email_sent: "Day 1",
    day2_email_sent: "Day 2",
    day7_email_sent: "Day 7",
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Mail className="h-4 w-4" /> Retention Email Sequence
        </h2>
        <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 gap-1.5 text-xs">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Sent</span>
              </div>
              <p className="text-2xl font-bold text-primary">{totalSent}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">In Queue</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalInQueue}</p>
              <p className="text-[10px] text-muted-foreground">sends pending next run</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Eligible</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{waitlist.length}</p>
              <p className="text-[10px] text-muted-foreground">activated users total</p>
            </div>
          </div>

          {/* Per-step breakdown */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Sequence Steps</p>
            </div>
            <div className="divide-y divide-border">
              {steps.map((step, i) => (
                <div key={step.key} className="px-4 py-3 flex items-center gap-4">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <span className={cn("flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[11px] font-bold shrink-0", step.color)}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{step.label}</span>
                  </div>

                  {/* Window */}
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                    {step.window} after signup
                  </span>

                  {/* Progress bar */}
                  <div className="flex-1 hidden sm:block">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: waitlist.length > 0 ? `${Math.min((step.sent / waitlist.length) * 100, 100)}%` : "0%" }}
                      />
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="flex items-center gap-4 shrink-0 ml-auto">
                    <div className="text-right">
                      <p className={cn("text-lg font-bold tabular-nums", step.color)}>{step.sent}</p>
                      <p className="text-[10px] text-muted-foreground">sent</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-foreground">{step.inQueue}</p>
                      <p className="text-[10px] text-muted-foreground">in queue</p>
                    </div>
                    {step.sent > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cron schedule */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Cron Schedule (UTC)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Day 1", time: "8:00 AM", url: "reengagement-cron" },
                { label: "Day 2", time: "9:00 AM", url: "day2-cron" },
                { label: "Day 7", time: "10:00 AM", url: "day7-cron" },
              ].map((c) => (
                <div key={c.label} className="text-center">
                  <p className="text-xs font-medium text-foreground">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground">{c.time} daily</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity feed */}
          {recentSends.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">Recent Sends (last 48h)</p>
              </div>
              <div className="divide-y divide-border">
                {recentSends.map((e, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                        {e.waitlist_signup_email.replace(/(.{2}).+(@.+)/, "$1***$2")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                        {eventLabels[e.event_type] || e.event_type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(e.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
