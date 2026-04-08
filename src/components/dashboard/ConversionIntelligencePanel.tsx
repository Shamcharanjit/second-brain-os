import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Users, Crown, Target, Sparkles, Loader2, ArrowUpRight,
  Zap, Clock, UserCheck, Award, BarChart3, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

/* ── types ── */

type ConversionCandidate = {
  user_id: string;
  email: string;
  plan_tier: string;
  is_early_access: boolean;
  billing_region: string;
  conversion_readiness_score: number;
  upgrade_prompt_eligible: boolean;
  referral_count: number;
  referral_reward_level: number;
  activation_completed_at: string | null;
  capture_count: number;
  project_count: number;
  memory_count: number;
  last_activity_at: string | null;
};

type ConversionSegments = {
  power_users: number;
  referral_leaders: number;
  recent_activations: number;
  high_engagement: number;
};

type ConversionSummary = {
  total_eligible: number;
  upgrade_ready: number;
  avg_score: number;
  india_count: number;
  international_count: number;
  pro_count: number;
};

type SortField = "score" | "activation" | "referrals" | "activity";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "***@" + domain;
}

function getTimingLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Now", color: "text-primary" };
  if (score >= 50) return { label: "Soon", color: "text-blue-500" };
  return { label: "Later", color: "text-muted-foreground" };
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "bg-primary/10 text-primary border-primary/20" :
    score >= 50 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
    score >= 25 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
    "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-bold tabular-nums", color)}>
      {score}
    </span>
  );
}

export default function ConversionIntelligencePanel() {
  const [candidates, setCandidates] = useState<ConversionCandidate[]>([]);
  const [segments, setSegments] = useState<ConversionSegments>({ power_users: 0, referral_leaders: 0, recent_activations: 0, high_engagement: 0 });
  const [summary, setSummary] = useState<ConversionSummary>({ total_eligible: 0, upgrade_ready: 0, avg_score: 0, india_count: 0, international_count: 0, pro_count: 0 });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>("score");

  const fetchConversion = async () => {
    setLoading(true);
    try {
      const res = await supabase.rpc("get_conversion_candidates" as any);
      if (res.error) {
        console.error("Conversion RPC error:", res.error);
        toast.error("Could not load conversion data");
      } else if (res.data) {
        const d = res.data as any;
        setCandidates(d.candidates || []);
        setSegments(d.segments || { power_users: 0, referral_leaders: 0, recent_activations: 0, high_engagement: 0 });
        setSummary(d.summary || { total_eligible: 0, upgrade_ready: 0, avg_score: 0, india_count: 0, international_count: 0, pro_count: 0 });
      }
    } catch (e) {
      console.error("Conversion fetch error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConversion(); }, []);

  /* ── sorted candidates ── */
  const sorted = useMemo(() => {
    const list = [...candidates].filter(c => c.plan_tier !== "pro");
    switch (sortBy) {
      case "score": return list.sort((a, b) => b.conversion_readiness_score - a.conversion_readiness_score);
      case "activation": return list.sort((a, b) => {
        if (!a.activation_completed_at && !b.activation_completed_at) return 0;
        if (!a.activation_completed_at) return 1;
        if (!b.activation_completed_at) return -1;
        return new Date(b.activation_completed_at).getTime() - new Date(a.activation_completed_at).getTime();
      });
      case "referrals": return list.sort((a, b) => b.referral_count - a.referral_count);
      case "activity": return list.sort((a, b) => {
        if (!a.last_activity_at && !b.last_activity_at) return 0;
        if (!a.last_activity_at) return 1;
        if (!b.last_activity_at) return -1;
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      });
      default: return list;
    }
  }, [candidates, sortBy]);

  /* ── MRR simulation ── */
  const simulation = useMemo(() => {
    const eligible = sorted.filter(c => c.conversion_readiness_score >= 50);
    const indiaPrice = 749; // INR
    const intlPrice = 9; // USD

    const simulate = (count: number) => {
      const top = eligible.slice(0, count);
      const indiaCount = top.filter(c => c.billing_region === "india").length;
      const intlCount = top.length - indiaCount;
      return {
        count: top.length,
        mrrUsd: intlCount * intlPrice,
        mrrInr: indiaCount * indiaPrice,
        indiaCount,
        intlCount,
        confidence: top.length > 0 ? Math.round(top.reduce((s, c) => s + c.conversion_readiness_score, 0) / top.length) : 0,
      };
    };

    return {
      top10: simulate(10),
      top25: simulate(25),
      top50: simulate(50),
    };
  }, [sorted]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Loading conversion intelligence…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Conversion Readiness Overview ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Conversion Readiness Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">Total Eligible</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{summary.total_eligible}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-primary">Upgrade Ready</span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{summary.upgrade_ready}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">Avg Score</span>
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{Math.round(summary.avg_score)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">Already Pro</span>
              <Crown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{summary.pro_count}</p>
          </div>
        </div>

        {/* Region split */}
        <div className="flex gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">🇮🇳 India</span>
            <span className="text-sm font-bold">{summary.india_count}</span>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">🌍 International</span>
            <span className="text-sm font-bold">{summary.international_count}</span>
          </div>
        </div>
      </section>

      {/* ── Conversion Segments ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Target className="h-4 w-4" /> Conversion Candidate Segments
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Power Users</span>
            </div>
            <p className="text-xl font-bold">{segments.power_users}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Award className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Referral Leaders</span>
            </div>
            <p className="text-xl font-bold">{segments.referral_leaders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Recent Activations</span>
            </div>
            <p className="text-xl font-bold">{segments.recent_activations}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">High Engagement</span>
            </div>
            <p className="text-xl font-bold">{segments.high_engagement}</p>
          </div>
        </div>
      </section>

      {/* ── Upgrade Simulation ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Conversion Impact Simulation
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: "Top 10", data: simulation.top10 },
            { label: "Top 25", data: simulation.top25 },
            { label: "Top 50", data: simulation.top50 },
          ].map(({ label, data }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">{label} Users</p>
              <p className="text-lg font-bold text-primary">${data.mrrUsd}/mo <span className="text-muted-foreground text-xs">+ ₹{data.mrrInr}/mo</span></p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>🌍 {data.intlCount}</span>
                <span>🇮🇳 {data.indiaCount}</span>
                <span>Candidates: {data.count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Confidence:</span>
                <ScoreBadge score={data.confidence} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Simulation only — no payments triggered.</p>
      </section>

      {/* ── Conversion Candidates Table ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Crown className="h-4 w-4" /> Conversion Candidates
          </h2>
          <div className="flex gap-1.5">
            {(["score", "activation", "referrals", "activity"] as SortField[]).map((f) => (
              <Button
                key={f}
                variant={sortBy === f ? "default" : "ghost"}
                size="sm"
                className="text-[10px] h-6 px-2"
                onClick={() => setSortBy(f)}
              >
                {f === "score" ? "Score" : f === "activation" ? "Activation" : f === "referrals" ? "Referrals" : "Activity"}
              </Button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No conversion candidates yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground">User</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Plan</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Score</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Timing</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Refs</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Reward</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Activated</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Activity</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 50).map((c) => {
                  const timing = getTimingLabel(c.conversion_readiness_score);
                  return (
                    <tr key={c.user_id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{maskEmail(c.email)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                          c.is_early_access ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                        )}>
                          {c.is_early_access ? "Early Access" : c.plan_tier}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center"><ScoreBadge score={c.conversion_readiness_score} /></td>
                      <td className={cn("px-3 py-2 text-center text-[10px] font-semibold", timing.color)}>{timing.label}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs">{c.referral_count}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs">{c.referral_reward_level}</td>
                      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">
                        {c.activation_completed_at ? format(new Date(c.activation_completed_at), "MMM d") : "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">
                        {c.last_activity_at ? format(new Date(c.last_activity_at), "MMM d") : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c.upgrade_prompt_eligible && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 font-medium">
                            <Sparkles className="h-2.5 w-2.5" /> Upgrade Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
