import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Brain, ArrowLeft, RefreshCw, Users, UserCheck, Clock,
  TrendingUp, BarChart3, Activity, Loader2, ShieldCheck,
  Zap, FolderKanban, BookOpen, Mic, ArrowRight, Gauge, Send, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, subHours, isAfter } from "date-fns";

/* ── types ── */

type WaitlistEntry = {
  id: string;
  status: string;
  invited: boolean;
  invite_token: string | null;
  invite_sent_at: string | null;
  referral_reward_level: number;
  created_at: string;
};

type CaptureRow = { user_id: string; input_type: string; created_at: string; updated_at: string };
type ProjectRow = { user_id: string; created_at: string; updated_at: string };
type MemoryRow = { user_id: string; created_at: string; updated_at: string };

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  accent?: boolean;
};

/* ── reusable card ── */

function StatCard({ label, value, icon: Icon, subtitle, accent }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className={cn("text-3xl font-bold tracking-tight", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ── funnel step component ── */

type FunnelStep = { label: string; value: number; icon: React.ElementType };

function ActivationFunnel({ steps }: { steps: FunnelStep[] }) {
  const maxVal = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Activation Funnel</p>
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 md:gap-2 min-w-0">
            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
              <step.icon className="h-4 w-4 text-primary" />
              <span className="text-lg md:text-2xl font-bold text-foreground tabular-nums">{step.value}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{step.label}</span>
              {/* bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max((step.value / maxVal) * 100, 4)}%` }}
                />
              </div>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── helpers ── */

function distinctUserIds(rows: { user_id: string }[]): Set<string> {
  return new Set(rows.map((r) => r.user_id));
}

function activeAfter(rows: { user_id: string; updated_at: string }[], cutoff: Date): number {
  const ids = new Set<string>();
  for (const r of rows) {
    if (isAfter(new Date(r.updated_at), cutoff)) ids.add(r.user_id);
  }
  return ids.size;
}

/* ── page ── */

export default function AdminAnalyticsPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [captures, setCaptures] = useState<CaptureRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wl, cap, proj, mem] = await Promise.all([
        supabase.from("waitlist_signups" as any).select("id, status, invited, invite_token, invite_sent_at, referral_reward_level, created_at").order("created_at", { ascending: false }),
        supabase.from("user_captures" as any).select("user_id, input_type, created_at, updated_at"),
        supabase.from("user_projects" as any).select("user_id, created_at, updated_at"),
        supabase.from("user_memory_entries" as any).select("user_id, created_at, updated_at"),
      ]);

      if (wl.error) throw wl.error;
      setWaitlist((wl.data as any as WaitlistEntry[]) || []);
      setCaptures((cap.data as any as CaptureRow[]) || []);
      setProjects((proj.data as any as ProjectRow[]) || []);
      setMemories((mem.data as any as MemoryRow[]) || []);
    } catch (e) {
      toast.error("Failed to load analytics data");
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (cloudAvailable && user) fetchData();
  }, [cloudAvailable, user]);

  /* ── waitlist metrics (unchanged) ── */
  const wlMetrics = useMemo(() => {
    const total = waitlist.length;
    const pending = waitlist.filter((e) => e.status === "pending").length;
    const invited = waitlist.filter((e) => e.invited).length;
    const reviewed = waitlist.filter((e) => e.status === "reviewed").length;
    const withToken = waitlist.filter((e) => e.invite_token).length;
    const conversionRate = total > 0 ? Math.round((invited / total) * 100) : 0;

    const sevenDaysAgo = subDays(new Date(), 7);
    const newLast7 = waitlist.filter((e) => isAfter(new Date(e.created_at), sevenDaysAgo)).length;

    const dailyBreakdown: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = format(day, "yyyy-MM-dd");
      const count = waitlist.filter((e) => format(new Date(e.created_at), "yyyy-MM-dd") === dayStr).length;
      dailyBreakdown.push({ date: format(day, "MMM d"), count });
    }

    return { total, pending, invited, reviewed, withToken, conversionRate, newLast7, dailyBreakdown };
  }, [waitlist]);

  /* ── activation metrics ── */
  const activation = useMemo(() => {
    const allUserIds = new Set<string>();
    for (const r of captures) allUserIds.add(r.user_id);
    for (const r of projects) allUserIds.add(r.user_id);
    for (const r of memories) allUserIds.add(r.user_id);

    const totalRegistered = allUserIds.size;
    const usersWithCapture = distinctUserIds(captures).size;
    const usersWithProject = distinctUserIds(projects).size;
    const usersWithMemory = distinctUserIds(memories).size;
    const usersWithVoice = distinctUserIds(captures.filter((c) => c.input_type === "voice")).size;

    const now = new Date();
    const allRows = [
      ...captures.map((c) => ({ user_id: c.user_id, updated_at: c.updated_at })),
      ...projects.map((p) => ({ user_id: p.user_id, updated_at: p.updated_at })),
      ...memories.map((m) => ({ user_id: m.user_id, updated_at: m.updated_at })),
    ];

    const active24h = activeAfter(allRows, subHours(now, 24));
    const active7d = activeAfter(allRows, subDays(now, 7));
    const active30d = activeAfter(allRows, subDays(now, 30));

    return {
      totalRegistered,
      usersWithCapture,
      usersWithProject,
      usersWithMemory,
      usersWithVoice,
      active24h,
      active7d,
      active30d,
    };
  }, [captures, projects, memories]);

  const hasActivationData = activation.totalRegistered > 0;

  /* ── auth gate ── */
  if (!cloudAvailable || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Sign in to access this page.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const maxDailyCount = Math.max(...wlMetrics.dailyBreakdown.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Founder Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/waitlist")} className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Waitlist Admin
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-8 space-y-8">
          {/* ═══ WAITLIST METRICS ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" /> Waitlist Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Signups" value={wlMetrics.total} icon={Users} accent />
              <StatCard label="Pending" value={wlMetrics.pending} icon={Clock} subtitle="Awaiting review" />
              <StatCard label="Invited" value={wlMetrics.invited} icon={UserCheck} accent />
              <StatCard label="Reviewed" value={wlMetrics.reviewed} icon={ShieldCheck} />
            </div>
          </section>

          {/* ═══ INVITE FUNNEL ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Invite Funnel
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Invites Issued" value={wlMetrics.withToken} icon={UserCheck} />
              <StatCard
                label="Invite Rate"
                value={`${wlMetrics.conversionRate}%`}
                icon={TrendingUp}
                accent
                subtitle={`${wlMetrics.invited} of ${wlMetrics.total} signups invited`}
              />
              <StatCard
                label="Pending Invites"
                value={wlMetrics.total - wlMetrics.invited}
                icon={Clock}
                subtitle="Users awaiting invite"
              />
            </div>
          </section>

          {/* ═══ GROWTH — LAST 7 DAYS ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" /> Growth — Last 7 Days
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="New Signups (7d)"
                value={wlMetrics.newLast7}
                icon={BarChart3}
                accent
                subtitle={`avg ${(wlMetrics.newLast7 / 7).toFixed(1)}/day`}
              />
              <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium text-muted-foreground mb-4">Daily Signups</p>
                <div className="flex items-end gap-2 h-32">
                  {wlMetrics.dailyBreakdown.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-foreground">{d.count}</span>
                      <div
                        className="w-full rounded-t-md bg-primary/80 transition-all"
                        style={{
                          height: `${Math.max((d.count / maxDailyCount) * 100, 4)}%`,
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ═══ STATUS BREAKDOWN ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Status Breakdown
            </h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Count</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Share</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground w-1/3">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Pending", count: wlMetrics.pending, color: "bg-muted-foreground" },
                    { label: "Invited", count: wlMetrics.invited, color: "bg-primary" },
                    { label: "Reviewed", count: wlMetrics.reviewed, color: "bg-accent-foreground" },
                  ].map((row) => {
                    const pct = wlMetrics.total > 0 ? Math.round((row.count / wlMetrics.total) * 100) : 0;
                    return (
                      <tr key={row.label} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{row.label}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{row.count}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{pct}%</td>
                        <td className="px-5 py-3">
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", row.color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
               PHASE 23 — EARLY ACCESS ACTIVATION SIGNALS
             ═══════════════════════════════════════════════════════════ */}

          <div className="border-t border-border pt-8 space-y-8">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4" /> Early Access Activation Signals
              </h2>

              {!hasActivationData ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No activation data yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Metrics will appear once users start using InsightHalo.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Activation funnel visualization */}
                  <ActivationFunnel
                    steps={[
                      { label: "Invited", value: wlMetrics.invited, icon: UserCheck },
                      { label: "Signed Up", value: activation.totalRegistered, icon: Users },
                      { label: "First Capture", value: activation.usersWithCapture, icon: Zap },
                      { label: "First Project", value: activation.usersWithProject, icon: FolderKanban },
                    ]}
                  />

                  {/* Activation stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard
                      label="Registered Users"
                      value={activation.totalRegistered}
                      icon={Users}
                      accent
                      subtitle="Distinct users with activity"
                    />
                    <StatCard
                      label="First Capture"
                      value={activation.usersWithCapture}
                      icon={Zap}
                      subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.usersWithCapture / activation.totalRegistered) * 100) : 0}% of users`}
                    />
                    <StatCard
                      label="First Project"
                      value={activation.usersWithProject}
                      icon={FolderKanban}
                      subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.usersWithProject / activation.totalRegistered) * 100) : 0}% of users`}
                    />
                    <StatCard
                      label="First Memory"
                      value={activation.usersWithMemory}
                      icon={BookOpen}
                      subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.usersWithMemory / activation.totalRegistered) * 100) : 0}% of users`}
                    />
                    <StatCard
                      label="Voice Capture"
                      value={activation.usersWithVoice}
                      icon={Mic}
                      subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.usersWithVoice / activation.totalRegistered) * 100) : 0}% of users`}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Retention indicators */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" /> Retention Indicators
              </h2>
              {!hasActivationData ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No activation data yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    label="Active — Last 24h"
                    value={activation.active24h}
                    icon={Activity}
                    accent
                    subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.active24h / activation.totalRegistered) * 100) : 0}% of users`}
                  />
                  <StatCard
                    label="Active — Last 7d"
                    value={activation.active7d}
                    icon={Activity}
                    subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.active7d / activation.totalRegistered) * 100) : 0}% of users`}
                  />
                  <StatCard
                    label="Active — Last 30d"
                    value={activation.active30d}
                    icon={Activity}
                    subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.active30d / activation.totalRegistered) * 100) : 0}% of users`}
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
