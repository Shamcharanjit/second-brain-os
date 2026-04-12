import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { isFounderAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import {
  Brain, ArrowLeft, RefreshCw, Users, UserCheck, Clock,
  TrendingUp, BarChart3, Activity, Loader2, ShieldCheck,
  Zap, FolderKanban, BookOpen, Mic, ArrowRight, Gauge, Send, Star, Flame, TrendingDown, Radar, AlertCircle, Rocket,
  Award, Target, Lightbulb, Crown, ArrowUpRight, ArrowDownRight, Minus,
  Shield, Pause, Play, ChevronDown, History, X, Check, Sparkles, PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, subHours, isAfter, differenceInDays } from "date-fns";
import ConversionIntelligencePanel from "@/components/dashboard/ConversionIntelligencePanel";
import ConversionCampaignPanel from "@/components/dashboard/ConversionCampaignPanel";
import PromptExperimentationPanel from "@/components/dashboard/PromptExperimentationPanel";
import UpgradeTimingPanel from "@/components/dashboard/UpgradeTimingPanel";
import PaywallIntelligencePanel from "@/components/dashboard/PaywallIntelligencePanel";
import ActivationFunnelPanel from "@/components/dashboard/ActivationFunnelPanel";
import ReferralVelocityPanel from "@/components/dashboard/ReferralVelocityPanel";

/* ── types ── */

type WaitlistEntry = {
  id: string;
  status: string;
  invited: boolean;
  invite_token: string | null;
  invite_sent_at: string | null;
  invite_opened_at: string | null;
  invite_accepted_at: string | null;
  activation_completed_at: string | null;
  referral_code: string | null;
  referral_count: number;
  referral_reward_level: number;
  email: string;
  name: string;
  created_at: string;
};

type CaptureRow = { user_id: string; input_type: string; review_status?: string; created_at: string; updated_at: string };
type ProjectRow = { user_id: string; created_at: string; updated_at: string };
type MemoryRow = { user_id: string; created_at: string; updated_at: string };
type RolloutDecision = {
  id: string;
  decided_at: string;
  recommended_batch: number;
  actual_sent: number;
  health_state: string;
  rollout_state: string;
  decision: string;
  notes: string | null;
};

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
      <p className={cn("text-3xl font-bold tracking-tight", accent ? "text-primary" : "text-foreground")}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ── trend indicator ── */
function TrendBadge({ direction }: { direction: "up" | "down" | "stable" }) {
  const config = {
    up: { icon: ArrowUpRight, label: "Up", cls: "bg-primary/10 text-primary border-primary/20" },
    down: { icon: ArrowDownRight, label: "Down", cls: "bg-destructive/10 text-destructive border-destructive/20" },
    stable: { icon: Minus, label: "Stable", cls: "bg-muted text-muted-foreground border-border" },
  }[direction];
  const TIcon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium", config.cls)}>
      <TIcon className="h-2.5 w-2.5" /> {config.label}
    </span>
  );
}

/* ── funnel step component ── */

type FunnelStep = { label: string; value: number; pct: number; icon: React.ElementType; trend: "up" | "down" | "stable" };

function ConversionFunnel({ steps }: { steps: FunnelStep[] }) {
  const maxVal = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Activation Funnel — Conversion Rates</p>
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 md:gap-2 min-w-0">
            <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
              <step.icon className="h-4 w-4 text-primary" />
              <span className="text-lg md:text-2xl font-bold text-foreground tabular-nums">{step.value}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{step.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-primary">{step.pct}%</span>
                <TrendBadge direction={step.trend} />
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max((step.value / maxVal) * 100, 4)}%` }}
                />
              </div>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── engagement badge ── */
function EngagementBadge({ level }: { level: "Low" | "Healthy" | "Strong" }) {
  const cls = level === "Strong" ? "bg-primary/10 text-primary border-primary/20" :
    level === "Healthy" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
    "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <span className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium", cls)}>
      {level}
    </span>
  );
}

/* ── cohort quality gauge ── */
function CohortGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-primary" : score >= 50 ? "text-blue-500" : score >= 25 ? "text-yellow-500" : "text-destructive";
  const borderColor = score >= 80 ? "border-primary/30" : score >= 50 ? "border-blue-500/30" : score >= 25 ? "border-yellow-500/30" : "border-destructive/30";
  const bgColor = score >= 80 ? "bg-primary/5" : score >= 50 ? "bg-blue-500/5" : score >= 25 ? "bg-yellow-500/5" : "bg-destructive/5";
  return (
    <div className={cn("rounded-xl border p-5 space-y-3", borderColor, bgColor)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Early Cohort Quality Score</span>
        <Award className={cn("h-4 w-4", color)} />
      </div>
      <div className="flex items-baseline gap-2">
        <p className={cn("text-4xl font-bold tracking-tight", color)}>{score}</p>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", score >= 80 ? "bg-primary" : score >= 50 ? "bg-blue-500" : score >= 25 ? "bg-yellow-500" : "bg-destructive")}
          style={{ width: `${score}%` }} />
      </div>
      <p className={cn("text-xs font-semibold", color)}>{label}</p>
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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "***@" + domain;
}

function getEngagementLevel(perUser: number): "Low" | "Healthy" | "Strong" {
  if (perUser >= 3) return "Strong";
  if (perUser >= 1) return "Healthy";
  return "Low";
}

/* ── page ── */

export default function AdminAnalyticsPage() {
  const { user, cloudAvailable } = useAuth();
  const navigate = useNavigate();

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [captures, setCaptures] = useState<CaptureRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [rolloutHistory, setRolloutHistory] = useState<RolloutDecision[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ early_access: number; pro: number; free: number; total: number; india: number; international: number }>({ early_access: 0, pro: 0, free: 0, total: 0, india: 0, international: 0 });
  const [loading, setLoading] = useState(true);

  // Rollout decision center state
  const [excludedCandidates, setExcludedCandidates] = useState<Set<string>>(new Set());
  const [rolloutNotes, setRolloutNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const wl = await supabase
        .from("waitlist_signups" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (wl.error) console.error("Waitlist query error:", wl.error);
      setWaitlist((wl.data as any as WaitlistEntry[]) || []);

      const rpc = await supabase.rpc("get_admin_analytics" as any);
      if (rpc.error) {
        console.error("Admin analytics RPC error:", rpc.error);
      } else if (rpc.data) {
        const d = rpc.data as any;
        setCaptures((d.captures as CaptureRow[]) || []);
        setProjects((d.projects as ProjectRow[]) || []);
        setMemories((d.memories as MemoryRow[]) || []);
      }

      // Fetch rollout history
      const rh = await supabase
        .from("rollout_decisions" as any)
        .select("*")
        .order("decided_at", { ascending: false })
        .limit(20);
      if (!rh.error && rh.data) {
        setRolloutHistory(rh.data as any as RolloutDecision[]);
      }

      // Fetch plan distribution
      const subsRes = await supabase.from("user_subscriptions" as any).select("plan_tier, is_early_access, subscription_status, billing_region");
      if (!subsRes.error && subsRes.data) {
        const subs = subsRes.data as any[];
        const ea = subs.filter(s => s.is_early_access).length;
        const pro = subs.filter(s => s.plan_tier === "pro" && !s.is_early_access && s.subscription_status === "active").length;
        const free = subs.filter(s => s.plan_tier === "free" && !s.is_early_access).length;
        const india = subs.filter(s => s.billing_region === "india").length;
        const international = subs.filter(s => s.billing_region === "international").length;
        setPlanDistribution({ early_access: ea, pro, free, total: subs.length, india, international });
      }
    } catch (e) {
      console.error("Analytics fetch error:", e);
      toast.error("Some analytics data could not be loaded");
    }
    setLoading(false);
  };

  useEffect(() => { if (cloudAvailable && user) fetchData(); }, [cloudAvailable, user]);

  /* ── waitlist metrics ── */
  const wlMetrics = useMemo(() => {
    const total = waitlist.length;
    const pending = waitlist.filter((e) => e.status === "pending").length;
    const invited = waitlist.filter((e) => e.invited).length;
    const reviewed = waitlist.filter((e) => e.status === "reviewed").length;
    const activated = waitlist.filter((e) => e.status === "activated" || e.invite_accepted_at).length;
    const withToken = waitlist.filter((e) => e.invite_token).length;
    const opened = waitlist.filter((e) => e.invite_opened_at).length;
    const accepted = waitlist.filter((e) => e.invite_accepted_at).length;
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

    return { total, pending, invited, reviewed, activated, withToken, opened, accepted, conversionRate, newLast7, dailyBreakdown };
  }, [waitlist]);

  /* ── PART 1: Activation funnel conversion ── */
  const funnelMetrics = useMemo(() => {
    const total = wlMetrics.total;
    const invited = wlMetrics.invited;
    const opened = wlMetrics.opened;
    const accepted = wlMetrics.accepted;
    const activated = wlMetrics.activated;

    const pctInvited = total > 0 ? Math.min(100, Math.round((invited / total) * 100)) : 0;
    const pctOpened = invited > 0 ? Math.min(100, Math.round((opened / invited) * 100)) : 0;
    const pctAccepted = opened > 0 ? Math.min(100, Math.round((accepted / opened) * 100)) : 0;
    const pctActivated = accepted > 0 ? Math.min(100, Math.round((activated / accepted) * 100)) : 0;

    const now = new Date();
    const d3 = subDays(now, 3);
    const d6 = subDays(now, 6);
    const recent = waitlist.filter((e) => isAfter(new Date(e.created_at), d3));
    const prior = waitlist.filter((e) => {
      const d = new Date(e.created_at);
      return isAfter(d, d6) && !isAfter(d, d3);
    });
    const recentInvited = recent.filter((e) => e.invited).length;
    const priorInvited = prior.filter((e) => e.invited).length;
    const trendInvited: "up" | "down" | "stable" = recentInvited > priorInvited ? "up" : recentInvited < priorInvited ? "down" : "stable";

    const recentOpened = recent.filter((e) => e.invite_opened_at).length;
    const priorOpened = prior.filter((e) => e.invite_opened_at).length;
    const trendOpened: "up" | "down" | "stable" = recentOpened > priorOpened ? "up" : recentOpened < priorOpened ? "down" : "stable";

    const recentAccepted = recent.filter((e) => e.invite_accepted_at).length;
    const priorAccepted = prior.filter((e) => e.invite_accepted_at).length;
    const trendAccepted: "up" | "down" | "stable" = recentAccepted > priorAccepted ? "up" : recentAccepted < priorAccepted ? "down" : "stable";

    const recentActivated = recent.filter((e) => e.activation_completed_at).length;
    const priorActivated = prior.filter((e) => e.activation_completed_at).length;
    const trendActivated: "up" | "down" | "stable" = recentActivated > priorActivated ? "up" : recentActivated < priorActivated ? "down" : "stable";

    return {
      steps: [
        { label: "Waitlist → Invited", value: invited, pct: pctInvited, icon: Send, trend: trendInvited },
        { label: "Invited → Opened", value: opened, pct: pctOpened, icon: Target, trend: trendOpened },
        { label: "Opened → Accepted", value: accepted, pct: pctAccepted, icon: UserCheck, trend: trendAccepted },
        { label: "Accepted → Activated", value: activated, pct: pctActivated, icon: Rocket, trend: trendActivated },
      ] as FunnelStep[],
    };
  }, [waitlist, wlMetrics]);

  /* ── PART 2: Referral velocity ── */
  const referralVelocity = useMemo(() => {
    const now = new Date();
    const h24 = subHours(now, 24);
    const d7 = subDays(now, 7);

    const totalRefs = waitlist.reduce((sum, e) => sum + e.referral_count, 0);
    const refs24h = waitlist.filter((e) => (e as any).referred_by && isAfter(new Date(e.created_at), h24)).length;
    const refs7d = waitlist.filter((e) => (e as any).referred_by && isAfter(new Date(e.created_at), d7)).length;

    const invitedCount = waitlist.filter((e) => e.invited).length;
    const avgPerInvited = invitedCount > 0 ? (totalRefs / invitedCount).toFixed(1) : "0";

    const yesterday = subHours(now, 48);
    const refsDayBefore = waitlist.filter((e) => (e as any).referred_by && isAfter(new Date(e.created_at), yesterday) && !isAfter(new Date(e.created_at), h24)).length;
    const viralAccelerating = refs24h > refsDayBefore;

    const topReferrers = [...waitlist]
      .filter((e) => e.referral_count > 0)
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, 5);

    return { refs24h, refs7d, totalRefs, avgPerInvited, viralAccelerating, topReferrers, refsDayBefore };
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

    return { totalRegistered, usersWithCapture, usersWithProject, usersWithMemory, usersWithVoice, active24h, active7d, active30d };
  }, [captures, projects, memories]);

  const hasActivationData = activation.totalRegistered > 0;

  /* ── Invite timing / health recommendation ── */
  const inviteRecommendation = useMemo(() => {
    const now = new Date();
    const h24 = subHours(now, 24);

    const sentToday = waitlist.filter((e) => e.invited && e.invite_sent_at && isAfter(new Date(e.invite_sent_at), h24)).length;
    const acceptedToday = activeAfter(
      [...captures.map((c) => ({ user_id: c.user_id, updated_at: c.created_at })),
       ...projects.map((p) => ({ user_id: p.user_id, updated_at: p.created_at })),
       ...memories.map((m) => ({ user_id: m.user_id, updated_at: m.created_at }))],
      h24
    );
    const activationRate = sentToday > 0 ? Math.round((acceptedToday / sentToday) * 100) : (activation.totalRegistered > 0 ? 50 : 0);

    const retentionRate = activation.totalRegistered > 0 ? Math.round((activation.active7d / activation.totalRegistered) * 100) : 0;
    const refScore = referralVelocity.viralAccelerating ? 20 : referralVelocity.refs24h > 0 ? 10 : 0;
    const engagementScore = activation.active7d > 0 ? Math.min(Math.round((captures.length / Math.max(activation.active7d, 1)) * 10), 30) : 0;
    const compositeScore = activationRate * 0.4 + retentionRate * 0.3 + refScore + engagementScore * 0.3;

    // Invite acceptance rate
    const totalInvited = waitlist.filter(e => e.invited).length;
    const totalAccepted = waitlist.filter(e => e.invite_accepted_at).length;
    const acceptanceRate = totalInvited > 0 ? Math.round((totalAccepted / totalInvited) * 100) : 0;

    let recommended: number;
    let explanation: string;
    let healthState: "strong" | "stable" | "moderate" | "weak";
    let rolloutState: "increase" | "hold" | "slow" | "pause";
    let riskLevel: "Low" | "Moderate" | "High";

    if (compositeScore >= 60) {
      recommended = 20;
      explanation = "Activation strong, retention healthy, referrals growing — safe to accelerate rollout";
      healthState = "strong";
      rolloutState = "increase";
      riskLevel = "Low";
    } else if (compositeScore >= 40) {
      recommended = 10;
      explanation = "Activation stable — proceed with standard rollout pace";
      healthState = "stable";
      rolloutState = "hold";
      riskLevel = "Low";
    } else if (compositeScore >= 20) {
      recommended = 5;
      explanation = "Activation moderate — conservative invite pace recommended";
      healthState = "moderate";
      rolloutState = "slow";
      riskLevel = "Moderate";
    } else {
      recommended = 2;
      explanation = "Activation weak — slow invite pace, focus on improving onboarding";
      healthState = "weak";
      rolloutState = "pause";
      riskLevel = "High";
    }

    const pendingHighPriority = waitlist.filter((e) => e.status === "pending" && !e.invited && e.referral_reward_level >= 3).length;

    return { recommended, explanation, compositeScore, activationRate, retentionRate, refScore, engagementScore, pendingHighPriority, sentToday, acceptedToday, healthState, rolloutState, riskLevel, acceptanceRate };
  }, [waitlist, captures, projects, memories, activation, referralVelocity]);

  /* ── PART 1: Daily invite queue candidates ── */
  const inviteCandidates = useMemo(() => {
    return waitlist
      .filter((e) => e.status === "pending" && !e.invited)
      .map((e) => ({
        ...e,
        priorityScore: e.referral_reward_level * 10 + e.referral_count * 2 + differenceInDays(new Date(), new Date(e.created_at)),
      }))
      .sort((a, b) => {
        if (b.referral_reward_level !== a.referral_reward_level) return b.referral_reward_level - a.referral_reward_level;
        if (b.referral_count !== a.referral_count) return b.referral_count - a.referral_count;
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [waitlist]);

  const activeCandidates = useMemo(() => {
    return inviteCandidates.filter(c => !excludedCandidates.has(c.id));
  }, [inviteCandidates, excludedCandidates]);

  const toggleExcludeCandidate = useCallback((id: string) => {
    setExcludedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ── Rollout decision handlers ── */
  const submitDecision = async (decision: "approve" | "reduce" | "pause", batchSize: number) => {
    setSubmittingDecision(true);
    try {
      const actualSent = decision === "pause" ? 0 : Math.min(batchSize, activeCandidates.length);

      // Log the decision
      const { error: logError } = await supabase.from("rollout_decisions" as any).insert({
        recommended_batch: inviteRecommendation.recommended,
        actual_sent: actualSent,
        health_state: inviteRecommendation.healthState,
        rollout_state: decision === "approve" ? inviteRecommendation.rolloutState : decision === "reduce" ? "slow" : "pause",
        decision,
        notes: rolloutNotes.trim() || null,
      } as any);

      if (logError) {
        console.error("Failed to log decision:", logError);
        toast.error("Failed to log rollout decision");
        setSubmittingDecision(false);
        return;
      }

      // If not pausing, send the batch
      if (decision !== "pause" && actualSent > 0) {
        const candidateIds = activeCandidates.slice(0, actualSent).map(c => c.id);
        const { data, error } = await supabase.functions.invoke("send-invite-email", {
          body: { batch_size: actualSent, approval: true },
        });
        if (error) {
          toast.error("Batch invite failed");
        } else if (data?.success) {
          toast.success(`Rollout approved: ${data.results?.sent || actualSent} invite(s) sent`);
        }
      } else if (decision === "pause") {
        toast.success("Rollout paused for today");
      }

      setRolloutNotes("");
      setExcludedCandidates(new Set());
      await fetchData();
    } catch (err) {
      console.error("Decision error:", err);
      toast.error("Failed to process rollout decision");
    }
    setSubmittingDecision(false);
  };

  /* ── Engagement heat signals ── */
  const engagementHeat = useMemo(() => {
    const activeUsers = Math.max(activation.active7d, 1);
    const sevenDaysAgo = subDays(new Date(), 7);
    const cap7d = captures.filter((c) => isAfter(new Date(c.created_at), sevenDaysAgo));
    const proj7d = projects.filter((p) => isAfter(new Date(p.created_at), sevenDaysAgo));
    const mem7d = memories.filter((m) => isAfter(new Date(m.created_at), sevenDaysAgo));
    const voice7d = captures.filter((c) => c.input_type === "voice" && isAfter(new Date(c.created_at), sevenDaysAgo));

    return {
      captures: { total: cap7d.length, perUser: cap7d.length / activeUsers, level: getEngagementLevel(cap7d.length / activeUsers) },
      projects: { total: proj7d.length, perUser: proj7d.length / activeUsers, level: getEngagementLevel(proj7d.length / activeUsers) },
      memories: { total: mem7d.length, perUser: mem7d.length / activeUsers, level: getEngagementLevel(mem7d.length / activeUsers) },
      voice: { total: voice7d.length, perUser: voice7d.length / activeUsers, level: getEngagementLevel(voice7d.length / activeUsers) },
    };
  }, [captures, projects, memories, activation.active7d]);

  /* ── Cohort Quality Score ── */
  const cohortScore = useMemo(() => {
    const totalInvited = Math.max(wlMetrics.invited, 1);
    const activationScore = Math.min(Math.round((wlMetrics.activated / totalInvited) * 100), 100);
    const referralScore = Math.min(Math.round((referralVelocity.totalRefs / totalInvited) * 50), 100);
    const captureScore = Math.min(Math.round((captures.length / Math.max(activation.totalRegistered, 1)) * 20), 100);
    const projectScore = Math.min(Math.round((projects.length / Math.max(activation.totalRegistered, 1)) * 30), 100);
    const memoryScore = Math.min(Math.round((memories.length / Math.max(activation.totalRegistered, 1)) * 30), 100);

    const weighted = Math.round(
      activationScore * 0.30 + referralScore * 0.20 + captureScore * 0.20 + projectScore * 0.15 + memoryScore * 0.15
    );
    const clamped = Math.min(weighted, 100);
    const label = clamped >= 80 ? "Excellent" : clamped >= 50 ? "Strong" : clamped >= 25 ? "Healthy" : "Low";
    return { score: clamped, label, activationScore, referralScore, captureScore, projectScore, memoryScore };
  }, [wlMetrics, referralVelocity, captures, projects, memories, activation]);

  /* ── Referral leaderboard ── */
  const referralLeaderboard = useMemo(() => {
    return [...waitlist]
      .filter((e) => e.referral_count > 0)
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, 10)
      .map((e) => ({
        email: maskEmail(e.email),
        name: e.name,
        referral_count: e.referral_count,
        reward_level: e.referral_reward_level,
        isFastTrack: e.referral_reward_level >= 3,
        priorityScore: e.referral_reward_level * 10 + e.referral_count * 2 + differenceInDays(new Date(), new Date(e.created_at)),
      }));
  }, [waitlist]);

  /* ── retention radar ── */
  type UserProfile = { userId: string; captures: number; projects: number; memories: number; voice: number; firstSeen: Date };

  const retentionRadar = useMemo(() => {
    const profiles = new Map<string, UserProfile>();
    const ensure = (uid: string, created: string) => {
      if (!profiles.has(uid)) profiles.set(uid, { userId: uid, captures: 0, projects: 0, memories: 0, voice: 0, firstSeen: new Date(created) });
      const p = profiles.get(uid)!;
      const d = new Date(created);
      if (d < p.firstSeen) p.firstSeen = d;
      return p;
    };
    for (const c of captures) { const p = ensure(c.user_id, c.created_at); p.captures++; if (c.input_type === "voice") p.voice++; }
    for (const p of projects) ensure(p.user_id, p.created_at).projects++;
    for (const m of memories) ensure(m.user_id, m.created_at).memories++;

    const all = Array.from(profiles.values());
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    const powerUsers = all.filter((u) => u.captures >= 3 || u.projects >= 1 || u.memories >= 1 || u.voice >= 1)
      .sort((a, b) => (b.captures + b.projects * 2 + b.memories + b.voice) - (a.captures + a.projects * 2 + a.memories + a.voice))
      .slice(0, 10);

    const h48ago = subHours(now, 48);
    const atRisk = all.filter((u) => u.captures === 0 && u.projects === 0 && u.memories === 0 && u.voice === 0 && u.firstSeen < h48ago)
      .sort((a, b) => a.firstSeen.getTime() - b.firstSeen.getTime()).slice(0, 10);

    const rising = all.filter((u) => u.captures >= 1 && isAfter(u.firstSeen, sevenDaysAgo))
      .sort((a, b) => (b.captures + b.projects) - (a.captures + a.projects)).slice(0, 10);

    return { powerUsers, atRisk, rising };
  }, [captures, projects, memories]);

  /* ── auth gate ── */
  if (!cloudAvailable || !user || !isFounderAdmin(user?.email)) {
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
  const REWARD_LABELS: Record<number, string> = { 0: "—", 1: "Priority", 3: "Fast-track", 5: "Feature access", 10: "Insider" };

  const rolloutStateConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    increase: { label: "Increase", icon: TrendingUp, cls: "text-primary" },
    hold: { label: "Hold", icon: Minus, cls: "text-blue-500" },
    slow: { label: "Slow", icon: TrendingDown, cls: "text-yellow-500" },
    pause: { label: "Pause", icon: Pause, cls: "text-destructive" },
  };

  const riskConfig: Record<string, string> = {
    Low: "bg-primary/10 text-primary border-primary/20",
    Moderate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    High: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Growth Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/waitlist")} className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Waitlist
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

          {/* ═══ ROLLOUT DECISION CENTER ═══ */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4" /> Rollout Decision Center
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Main recommendation card */}
              <div className={cn(
                "rounded-xl border p-5 space-y-4 md:row-span-2",
                inviteRecommendation.compositeScore >= 60 ? "border-primary/30 bg-primary/5" :
                inviteRecommendation.compositeScore >= 40 ? "border-blue-500/30 bg-blue-500/5" :
                inviteRecommendation.compositeScore >= 20 ? "border-yellow-500/30 bg-yellow-500/5" :
                "border-destructive/30 bg-destructive/5"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Recommended Batch Today</span>
                  <Gauge className={cn("h-4 w-4",
                    inviteRecommendation.compositeScore >= 60 ? "text-primary" :
                    inviteRecommendation.compositeScore >= 40 ? "text-blue-500" :
                    inviteRecommendation.compositeScore >= 20 ? "text-yellow-500" : "text-destructive"
                  )} />
                </div>
                <p className={cn("text-5xl font-bold tracking-tight",
                  inviteRecommendation.compositeScore >= 60 ? "text-primary" :
                  inviteRecommendation.compositeScore >= 40 ? "text-blue-500" :
                  inviteRecommendation.compositeScore >= 20 ? "text-yellow-500" : "text-destructive"
                )}>
                  {inviteRecommendation.recommended}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{inviteRecommendation.explanation}</p>

                {/* Risk & State indicators */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", riskConfig[inviteRecommendation.riskLevel])}>
                    Risk: {inviteRecommendation.riskLevel}
                  </span>
                  {(() => {
                    const cfg = rolloutStateConfig[inviteRecommendation.rolloutState] || rolloutStateConfig.hold;
                    const SIcon = cfg.icon;
                    return (
                      <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-card border-border", cfg.cls)}>
                        <SIcon className="h-2.5 w-2.5" /> {cfg.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Decision buttons */}
                <div className="space-y-2 pt-2">
                  <textarea
                    value={rolloutNotes}
                    onChange={(e) => setRolloutNotes(e.target.value)}
                    placeholder="Optional notes for this decision…"
                    rows={2}
                    className="w-full text-xs rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={submittingDecision || activeCandidates.length === 0}
                      onClick={() => submitDecision("approve", inviteRecommendation.recommended)}
                      className="gap-1.5 text-xs"
                    >
                      {submittingDecision ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approve Batch ({Math.min(inviteRecommendation.recommended, activeCandidates.length)})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submittingDecision || activeCandidates.length === 0}
                      onClick={() => submitDecision("reduce", Math.max(Math.floor(inviteRecommendation.recommended / 2), 2))}
                      className="gap-1.5 text-xs"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Reduce ({Math.min(Math.max(Math.floor(inviteRecommendation.recommended / 2), 2), activeCandidates.length)})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submittingDecision}
                      onClick={() => submitDecision("pause", 0)}
                      className="gap-1.5 text-xs text-destructive hover:text-destructive"
                    >
                      <Pause className="h-3 w-3" /> Pause Today
                    </Button>
                  </div>
                </div>
              </div>

              {/* Health metric cards */}
              <StatCard label="Activation Rate" value={`${inviteRecommendation.activationRate}%`} icon={TrendingUp} accent subtitle="Active / Invited today" />
              <StatCard label="Acceptance Rate" value={`${inviteRecommendation.acceptanceRate}%`} icon={UserCheck} subtitle="Accepted / Total invited" />
              <StatCard label="Retention (7d)" value={`${inviteRecommendation.retentionRate}%`} icon={Activity} subtitle="Active users / Total" />
              <StatCard label="Pending High-Priority" value={inviteRecommendation.pendingHighPriority} icon={Star} subtitle="Reward level ≥ 3" />
            </div>

            {/* Auto-prepared invite candidates */}
            {inviteCandidates.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Invite Candidates (Top {Math.min(inviteCandidates.length, 20)})</span>
                    {excludedCandidates.size > 0 && (
                      <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                        {excludedCandidates.size} excluded
                      </span>
                    )}
                  </div>
                  {excludedCandidates.size > 0 && (
                    <button onClick={() => setExcludedCandidates(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground">
                      Reset
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-8"></th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">User</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Reward</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Referrals</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Priority</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inviteCandidates.slice(0, 20).map((c, i) => {
                        const excluded = excludedCandidates.has(c.id);
                        return (
                          <tr key={c.id} className={cn("border-b last:border-0 transition-colors", excluded ? "opacity-40 bg-muted/10" : "hover:bg-muted/20")}>
                            <td className="px-4 py-2">
                              <button onClick={() => toggleExcludeCandidate(c.id)} className="p-0.5 rounded hover:bg-muted">
                                {excluded ? <X className="h-3 w-3 text-destructive" /> : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                              </button>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-xs font-medium">{c.name}</span>
                              <span className="block text-[10px] text-muted-foreground">{maskEmail(c.email)}</span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {c.referral_reward_level > 0 ? (
                                <span className={cn("inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                                  c.referral_reward_level >= 3 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                                )}>
                                  {REWARD_LABELS[c.referral_reward_level] || `Lvl ${c.referral_reward_level}`}
                                </span>
                              ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-medium text-primary tabular-nums">{c.referral_count}</td>
                            <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">{c.priorityScore}</td>
                            <td className="px-4 py-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{c.status}</span>
                            </td>
                            <td className="px-4 py-2 text-right text-[10px] text-muted-foreground">{differenceInDays(new Date(), new Date(c.created_at))}d</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ═══ ACTIVATION FUNNEL ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Activation Funnel
            </h2>
            <ConversionFunnel steps={funnelMetrics.steps} />
          </section>

          {/* ═══ REFERRAL VELOCITY ENGINE ═══ */}
          <ReferralVelocityPanel waitlist={waitlist as any} />

          {/* ═══ ENGAGEMENT HEAT SIGNALS ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" /> Engagement Heat Signals
            </h2>
            {!hasActivationData ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No engagement data yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Captures / User", icon: Zap, ...engagementHeat.captures },
                  { label: "Projects / User", icon: FolderKanban, ...engagementHeat.projects },
                  { label: "Memories / User", icon: BookOpen, ...engagementHeat.memories },
                  { label: "Voice / User", icon: Mic, ...engagementHeat.voice },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{item.perUser.toFixed(1)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{item.total} total (7d)</span>
                      <EngagementBadge level={item.level} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══ COHORT QUALITY + LEADERBOARD ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4" /> Cohort Quality Score
              </h2>
              <CohortGauge score={cohortScore.score} label={cohortScore.label} />
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Score Breakdown</p>
                {[
                  { label: "Activation (30%)", value: cohortScore.activationScore },
                  { label: "Referrals (20%)", value: cohortScore.referralScore },
                  { label: "Captures (20%)", value: cohortScore.captureScore },
                  { label: "Projects (15%)", value: cohortScore.projectScore },
                  { label: "Memory (15%)", value: cohortScore.memoryScore },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0">{item.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.value}%` }} />
                    </div>
                    <span className="text-[10px] font-medium text-foreground tabular-nums w-8 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Crown className="h-4 w-4" /> Referral Leaderboard
              </h2>
              {referralLeaderboard.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No referrals yet</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Referrals</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Reward</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralLeaderboard.map((r, i) => (
                        <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", r.isFastTrack && "bg-primary/5")}>
                          <td className="px-4 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div>
                              <span className="text-xs font-medium">{r.name}</span>
                              <span className="block text-[10px] text-muted-foreground">{r.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums">{r.referral_count}</td>
                          <td className="px-4 py-2.5">
                            {r.reward_level > 0 ? (
                              <span className={cn(
                                "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium",
                                r.reward_level >= 10 ? "bg-primary/15 text-primary border-primary/30" :
                                r.reward_level >= 5 ? "bg-primary/10 text-primary/80 border-primary/20" :
                                r.reward_level >= 3 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                "bg-muted text-muted-foreground border-border"
                              )}>
                                {REWARD_LABELS[r.reward_level] || `Lvl ${r.reward_level}`}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground">{r.priorityScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* ═══ ROLLOUT HISTORY LOG ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4" /> Rollout History
            </h2>
            {rolloutHistory.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No rollout decisions yet</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Recommended</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Sent</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Health</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">State</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Decision</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolloutHistory.map((d) => {
                        const stateCfg = rolloutStateConfig[d.rollout_state] || rolloutStateConfig.hold;
                        const StateIcon = stateCfg.icon;
                        const decisionColors: Record<string, string> = {
                          approve: "bg-primary/10 text-primary border-primary/20",
                          reduce: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
                          pause: "bg-destructive/10 text-destructive border-destructive/20",
                        };
                        return (
                          <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(d.decided_at), "MMM d, h:mm a")}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">{d.recommended_batch}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary">{d.actual_sent}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                                d.health_state === "strong" ? "bg-primary/10 text-primary border-primary/20" :
                                d.health_state === "stable" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                d.health_state === "moderate" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
                                "bg-destructive/10 text-destructive border-destructive/20"
                              )}>{d.health_state}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("inline-flex items-center gap-0.5 text-[10px]", stateCfg.cls)}>
                                <StateIcon className="h-2.5 w-2.5" /> {stateCfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                                decisionColors[d.decision] || "bg-muted text-muted-foreground border-border"
                              )}>{d.decision}</span>
                            </td>
                            <td className="px-4 py-2.5 text-[10px] text-muted-foreground max-w-[200px] truncate">
                              {d.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ═══ PLAN DISTRIBUTION ═══ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <PieChart className="h-4 w-4" /> Plan Distribution
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Early Access</span>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold text-primary tabular-nums">{planDistribution.early_access}</p>
                <p className="text-[10px] text-muted-foreground">Pro features included</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Pro (Paid)</span>
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{planDistribution.pro}</p>
                <p className="text-[10px] text-muted-foreground">$9/month · ₹749/month</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Free</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-muted-foreground tabular-nums">{planDistribution.free}</p>
                <p className="text-[10px] text-muted-foreground">Basic access</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold text-primary tabular-nums">
                  {planDistribution.total > 0 ? Math.round(((planDistribution.pro) / planDistribution.total) * 100) : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {planDistribution.early_access + planDistribution.free} eligible for upgrade
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">🇮🇳 India (Razorpay)</span>
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{planDistribution.india}</p>
                <p className="text-[10px] text-muted-foreground">₹ billing region</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">🌍 International (Stripe)</span>
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{planDistribution.international}</p>
                <p className="text-[10px] text-muted-foreground">$ billing region</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/plans")}>
                <Crown className="h-3.5 w-3.5" /> Manage Plans
              </Button>
            </div>
          </section>

          {/* ═══ ACTIVATION FUNNEL INTELLIGENCE ═══ */}
          <section className="space-y-3">
            <ActivationFunnelPanel />
          </section>

          {/* ═══ WAITLIST METRICS ═══ */}
          <div className="border-t border-border pt-8 space-y-8">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4" /> Waitlist Metrics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Signups" value={wlMetrics.total} icon={Users} accent />
                <StatCard label="Pending" value={wlMetrics.pending} icon={Clock} subtitle="Awaiting review" />
                <StatCard label="Invited" value={wlMetrics.invited} icon={UserCheck} accent />
                <StatCard label="Activated" value={wlMetrics.activated} icon={Rocket} accent />
                <StatCard label="Growth (7d)" value={wlMetrics.newLast7} icon={TrendingUp} subtitle={`avg ${(wlMetrics.newLast7 / 7).toFixed(1)}/day`} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Daily Signups
              </h2>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-end gap-2 h-32">
                  {wlMetrics.dailyBreakdown.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-foreground">{d.count}</span>
                      <div className="w-full rounded-t-md bg-primary/80 transition-all"
                        style={{ height: `${Math.max((d.count / maxDailyCount) * 100, 4)}%`, minHeight: "4px" }} />
                      <span className="text-[10px] text-muted-foreground">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══ RETENTION INDICATORS ═══ */}
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
                  <StatCard label="Active — Last 24h" value={activation.active24h} icon={Activity} accent
                    subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.active24h / activation.totalRegistered) * 100) : 0}% of users`} />
                  <StatCard label="Active — Last 7d" value={activation.active7d} icon={Activity}
                    subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.active7d / activation.totalRegistered) * 100) : 0}% of users`} />
                  <StatCard label="Active — Last 30d" value={activation.active30d} icon={Activity}
                    subtitle={`${activation.totalRegistered > 0 ? Math.round((activation.active30d / activation.totalRegistered) * 100) : 0}% of users`} />
                </div>
              )}
            </section>

            {/* ═══ CONVERSION INTELLIGENCE ═══ */}
            <section className="space-y-3">
              <ConversionIntelligencePanel />
            </section>

            {/* ═══ CONVERSION CAMPAIGNS ═══ */}
            <section className="space-y-3">
              <ConversionCampaignPanel />
            </section>

            {/* ═══ PROMPT A/B EXPERIMENTATION ═══ */}
            <section className="space-y-3">
              <PromptExperimentationPanel />
            </section>

            {/* ═══ UPGRADE TIMING ENGINE ═══ */}
            <section className="space-y-3">
              <UpgradeTimingPanel />
            </section>

            {/* ═══ PAYWALL INTELLIGENCE ═══ */}
            <section className="space-y-3">
              <PaywallIntelligencePanel />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Radar className="h-4 w-4" /> Retention Radar
              </h2>
              {!hasActivationData ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No user data yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Power Users */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Power Users</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{retentionRadar.powerUsers.length}</span>
                    </div>
                    {retentionRadar.powerUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 pl-5">No power users yet</p>
                    ) : (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b bg-muted/30">
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Captures</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Projects</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Memory</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Voice</th>
                          </tr></thead>
                          <tbody>
                            {retentionRadar.powerUsers.map((u) => (
                              <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{u.userId.slice(0, 8)}…</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{u.captures}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{u.projects}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{u.memories}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{u.voice}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* At Risk */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-semibold text-foreground">At Risk Users</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{retentionRadar.atRisk.length}</span>
                    </div>
                    {retentionRadar.atRisk.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 pl-5">No at-risk users detected</p>
                    ) : (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b bg-muted/30">
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Signed Up</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Days Inactive</th>
                          </tr></thead>
                          <tbody>
                            {retentionRadar.atRisk.map((u) => (
                              <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{u.userId.slice(0, 8)}…</td>
                                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{format(u.firstSeen, "MMM d")}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{differenceInDays(new Date(), u.firstSeen)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Rising */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Rising Users</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{retentionRadar.rising.length}</span>
                    </div>
                    {retentionRadar.rising.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 pl-5">No rising users yet</p>
                    ) : (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b bg-muted/30">
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Captures</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Projects</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Joined</th>
                          </tr></thead>
                          <tbody>
                            {retentionRadar.rising.map((u) => (
                              <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{u.userId.slice(0, 8)}…</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{u.captures}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{u.projects}</td>
                                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{format(u.firstSeen, "MMM d")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
