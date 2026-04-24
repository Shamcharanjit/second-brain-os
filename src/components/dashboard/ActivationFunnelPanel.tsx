import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowDown, Loader2, TrendingUp, Activity,
  Users, Send, Target, UserCheck, Rocket, Zap,
  BookOpen, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2,
  Gauge, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RpcMetricValue = number | string | null | undefined;

type FunnelSummary = {
  counts?: Record<string, RpcMetricValue>;
  rates?: Record<string, RpcMetricValue>;
};

type DerivedHealth = {
  activationHealthScore: number;
  healthLabel: "strong" | "stable" | "weak" | "critical";
  biggestDropoffStage: string;
  strongestStage: string;
  recommendedAction: string;
};

const FUNNEL_COUNT_KEYS = [
  "waitlist_signed_up",
  "waitlist_email_sent",
  "approval_email_sent",
  "invite_link_opened",
  "invite_token_validated",
  "password_set",
  "activation_completed",
  "first_login",
  "first_capture_created",
  "day2_retained",
  "day7_retained",
] as const;

const normalizeFunnelSummary = (input: unknown): FunnelSummary => {
  const source = (input && typeof input === "object" ? input : {}) as Partial<FunnelSummary>;
  const rawCounts = source.counts && typeof source.counts === "object" ? source.counts : {};
  const rawRates = source.rates && typeof source.rates === "object" ? source.rates : {};

  const counts = Object.fromEntries(
    FUNNEL_COUNT_KEYS.map((key) => [key, Number(rawCounts[key] ?? 0)]),
  ) as Record<string, number>;

  const rates = Object.entries(rawRates).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = Number(value ?? 0);
    return acc;
  }, {});

  return { counts, rates };
};

const FUNNEL_STAGES = [
  { key: "waitlist_signed_up", label: "Waitlist Signup", icon: Users },
  { key: "waitlist_email_sent", label: "Waitlist Email", icon: Send },
  { key: "approval_email_sent", label: "Approval Email", icon: Target },
  { key: "invite_link_opened", label: "Invite Open", icon: UserCheck },
  { key: "invite_token_validated", label: "Valid Token", icon: ShieldCheck },
  { key: "password_set", label: "Password Set", icon: Zap },
  { key: "activation_completed", label: "Activation Complete", icon: Rocket },
  { key: "first_login", label: "First Login", icon: Activity },
  { key: "first_capture_created", label: "First Capture", icon: Zap },
  { key: "day2_retained", label: "Day 2 Return", icon: Clock },
  { key: "day7_retained", label: "Day 7 Return", icon: TrendingUp },
];

const getMetric = (record: Record<string, RpcMetricValue> | undefined, key: string) => Number(record?.[key] ?? 0);

const HEALTH_RATE_KEYS = [
  "signup_to_email_rate",
  "signup_to_approval_rate",
  "approval_to_open_rate",
  "open_to_valid_token_rate",
  "valid_token_to_password_rate",
  "password_to_activation_rate",
  "activation_to_login_rate",
  "activation_to_capture_rate",
  "activation_to_day2_rate",
  "activation_to_day7_rate",
] as const;

const deriveHealth = (summary: FunnelSummary | null): DerivedHealth | null => {
  if (!summary) return null;

  const counts = summary.counts;
  const rates = summary.rates;
  const healthRates = HEALTH_RATE_KEYS.map((key) => getMetric(rates, key));
  const averageRate = healthRates.length
    ? healthRates.reduce((total, value) => total + value, 0) / healthRates.length
    : 0;

  const activationToDay7 = getMetric(rates, "activation_to_day7_rate");
  const activationToCapture = getMetric(rates, "activation_to_capture_rate");
  const activationToLogin = getMetric(rates, "activation_to_login_rate");
  const activationHealthScore = Math.round((averageRate * 0.6) + (activationToCapture * 0.25) + (activationToDay7 * 0.15));

  let healthLabel: DerivedHealth["healthLabel"] = "critical";
  if (activationHealthScore >= 80) healthLabel = "strong";
  else if (activationHealthScore >= 55) healthLabel = "stable";
  else if (activationHealthScore >= 25) healthLabel = "weak";

  let biggestDropoffStage = FUNNEL_STAGES[0].label;
  let biggestDropoffValue = -1;

  for (let index = 1; index < FUNNEL_STAGES.length; index += 1) {
    const previous = getMetric(counts, FUNNEL_STAGES[index - 1].key);
    const current = getMetric(counts, FUNNEL_STAGES[index].key);
    const dropoff = Math.max(previous - current, 0);

    if (dropoff > biggestDropoffValue) {
      biggestDropoffValue = dropoff;
      biggestDropoffStage = FUNNEL_STAGES[index].label;
    }
  }

  const strongestStage = activationToLogin >= activationToCapture
    ? "First Login"
    : "First Capture";

  const recommendedAction = activationToCapture < 50
    ? "Improve first capture conversion after login"
    : activationToDay7 < 25
      ? "Improve early retention after activation"
      : "Monitor invite-open conversion for the next cohort";

  return {
    activationHealthScore,
    healthLabel,
    biggestDropoffStage,
    strongestStage,
    recommendedAction,
  };
};

export default function ActivationFunnelPanel() {
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: funnelData, error: funnelError } = await supabase.rpc("get_rebuilt_funnel");
      
      if (funnelError) {
        console.error("[ActivationFunnelPanel] get_rebuilt_funnel error:", funnelError);
      }
      
      if (funnelData) {
        console.log("[ActivationFunnelPanel] Funnel data:", funnelData);
        setSummary((funnelData ?? null) as FunnelSummary | null);
      }
    } catch (err) {
      console.error("[ActivationFunnelPanel] fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const counts = summary?.counts;
  const rates = summary?.rates;
  const health = deriveHealth(summary);

  const healthColor = health?.healthLabel === "strong" ? "text-primary" :
    health?.healthLabel === "stable" ? "text-blue-500" :
    health?.healthLabel === "weak" ? "text-yellow-500" : "text-destructive";

  const healthBg = health?.healthLabel === "strong" ? "bg-primary/5 border-primary/30" :
    health?.healthLabel === "stable" ? "bg-blue-500/5 border-blue-500/30" :
    health?.healthLabel === "weak" ? "bg-yellow-500/5 border-yellow-500/30" :
    "bg-destructive/5 border-destructive/30";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Activation Funnel Intelligence
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* ── Health Score Card ── */}
      {health && (
        <div className={cn("rounded-xl border p-5 space-y-3", healthBg)}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Activation Health Score</span>
            <Gauge className={cn("h-4 w-4", healthColor)} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className={cn("text-4xl font-bold tracking-tight", healthColor)}>
              {Math.round(health.activationHealthScore)}
            </p>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <span className={cn("text-xs font-semibold uppercase ml-2", healthColor)}>
              {health.healthLabel}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                health.healthLabel === "strong" ? "bg-primary" :
                health.healthLabel === "stable" ? "bg-blue-500" :
                health.healthLabel === "weak" ? "bg-yellow-500" : "bg-destructive"
              )}
              style={{ width: `${health.activationHealthScore}%` }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Biggest Dropoff</p>
                <p className="text-xs font-medium text-foreground">{health.biggestDropoffStage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Strongest Stage</p>
                <p className="text-xs font-medium text-foreground">{health.strongestStage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Recommended Action</p>
                <p className="text-xs font-medium text-foreground">{health.recommendedAction}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Funnel Visualization ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Full Activation Funnel</p>
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Analytics RPC Source:</span> get_rebuilt_funnel
          <span className="mx-2 text-border">•</span>
          Counts: waitlist_signed_up={getMetric(counts, "waitlist_signed_up")}
        </div>
        <div className="space-y-1">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = getMetric(counts, stage.key);
            const baseCount = getMetric(counts, FUNNEL_STAGES[0].key) || 1;
            const pct = i === 0 ? 100 : Math.round((count / baseCount) * 100);
            const StageIcon = stage.icon;
            return (
              <div key={stage.key}>
                <div className="flex items-center gap-3 py-1.5">
                  <StageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                        <span className="text-[10px] text-primary font-medium tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <div className="flex items-center pl-5 py-0.5">
                    <ArrowDown className="h-2.5 w-2.5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Conversion Rates ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Stage-to-Stage Conversion Rates</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Signup → Email", key: "signup_to_email_rate" },
            { label: "Signup → Approval", key: "signup_to_approval_rate" },
            { label: "Approval → Open", key: "approval_to_open_rate" },
            { label: "Open → Valid", key: "open_to_valid_token_rate" },
            { label: "Valid → Password", key: "valid_token_to_password_rate" },
            { label: "Password → Active", key: "password_to_activation_rate" },
            { label: "Active → Login", key: "activation_to_login_rate" },
            { label: "Active → Capture", key: "activation_to_capture_rate" },
            { label: "Active → Day 2", key: "activation_to_day2_rate" },
            { label: "Active → Day 7", key: "activation_to_day7_rate" },
          ].map((r) => {
            const val = getMetric(rates, r.key);
            const color = val >= 80 ? "text-primary" : val >= 50 ? "text-blue-500" : val >= 25 ? "text-yellow-500" : "text-destructive";
            return (
              <div key={r.key} className="rounded-lg border border-border bg-background p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground leading-tight">{r.label}</p>
                <p className={cn("text-lg font-bold tabular-nums", color)}>{val}%</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
