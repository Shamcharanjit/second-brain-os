import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowRight, ArrowDown, Loader2, TrendingUp, Activity,
  Users, Send, Target, UserCheck, Rocket, Zap, FolderKanban,
  BookOpen, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2,
  Gauge, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type FunnelSummary = {
  counts: Record<string, number>;
  rates: Record<string, number>;
};

type HealthScore = {
  activation_health_score: number;
  health_label: string;
  biggest_dropoff_stage: string;
  strongest_stage: string;
  recommended_action: string;
  stage_rates: Record<string, number>;
};

type JourneyRow = {
  waitlist_signup_email: string;
  invited_at: string | null;
  activated_at: string | null;
  first_login_at: string | null;
  first_capture_at: string | null;
  second_session_at: string | null;
  day2_retained: boolean;
  day7_retained: boolean;
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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "***@" + domain;
}

export default function ActivationFunnelPanel() {
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rebuiltRes, healthRes, journeyRes] = await Promise.all([
        // Authoritative funnel RPC (production-deployed)
        supabase.rpc("get_rebuilt_funnel" as any),
        supabase.rpc("get_activation_health_score" as any),
        supabase
          .from("activation_funnel_events" as any)
          .select("waitlist_signup_email, event_type, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      if (rebuiltRes.error) {
        console.error("[ActivationFunnelPanel] get_rebuilt_funnel error:", rebuiltRes.error);
      }
      const funnelPayload = rebuiltRes.data as any;
      if (funnelPayload) setSummary(funnelPayload);
      if (healthRes.data) setHealth(healthRes.data as any);

      // Build journey rows from raw events
      if (journeyRes.data) {
        const events = journeyRes.data as any[];
        const byEmail = new Map<string, JourneyRow>();

        for (const e of events) {
          const email = e.waitlist_signup_email || e.user_id || "unknown";
          if (!byEmail.has(email)) {
            byEmail.set(email, {
              waitlist_signup_email: e.waitlist_signup_email || `user:${e.user_id?.slice(0, 8)}`,
              invited_at: null,
              activated_at: null,
              first_login_at: null,
              first_capture_at: null,
              second_session_at: null,
              day2_retained: false,
              day7_retained: false,
            });
          }
          const j = byEmail.get(email)!;
          switch (e.event_type) {
            case "approval_email_sent": j.invited_at = j.invited_at || e.created_at; break;
            case "activation_completed": j.activated_at = j.activated_at || e.created_at; break;
            case "first_login": j.first_login_at = j.first_login_at || e.created_at; break;
            case "first_capture_created": j.first_capture_at = j.first_capture_at || e.created_at; break;
            case "second_session_returned": j.second_session_at = j.second_session_at || e.created_at; break;
            case "day2_retained": j.day2_retained = true; break;
            case "day7_retained": j.day7_retained = true; break;
          }
        }
        setJourneys(Array.from(byEmail.values()).slice(0, 20));
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

  const counts = summary?.counts || {};
  const rates = summary?.rates || {};
  const maxCount = Math.max(...FUNNEL_STAGES.map(s => counts[s.key] || 0), 1);

  const healthColor = health?.health_label === "strong" ? "text-primary" :
    health?.health_label === "stable" ? "text-blue-500" :
    health?.health_label === "weak" ? "text-yellow-500" : "text-destructive";

  const healthBg = health?.health_label === "strong" ? "bg-primary/5 border-primary/30" :
    health?.health_label === "stable" ? "bg-blue-500/5 border-blue-500/30" :
    health?.health_label === "weak" ? "bg-yellow-500/5 border-yellow-500/30" :
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
              {Math.round(health.activation_health_score)}
            </p>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <span className={cn("text-xs font-semibold uppercase ml-2", healthColor)}>
              {health.health_label}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                health.health_label === "strong" ? "bg-primary" :
                health.health_label === "stable" ? "bg-blue-500" :
                health.health_label === "weak" ? "bg-yellow-500" : "bg-destructive"
              )}
              style={{ width: `${health.activation_health_score}%` }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Biggest Dropoff</p>
                <p className="text-xs font-medium text-foreground">{health.biggest_dropoff_stage.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Strongest Stage</p>
                <p className="text-xs font-medium text-foreground">{health.strongest_stage.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Recommended Action</p>
                <p className="text-xs font-medium text-foreground">{health.recommended_action}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Funnel Visualization ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Full Activation Funnel</p>
        <div className="space-y-1">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = counts[stage.key] || 0;
            const pct = i === 0 ? 100 : (maxCount > 0 ? Math.round((count / (counts[FUNNEL_STAGES[0].key] || 1)) * 100) : 0);
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
            // Keys aligned with get_rebuilt_funnel() rates payload
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
            const val = rates[r.key] || 0;
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

      {/* ── Recent Activation Journeys ── */}
      {journeys.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Recent Activation Journeys</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Invited</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Activated</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">1st Login</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">1st Capture</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Day 2</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Day 7</th>
                </tr>
              </thead>
              <tbody>
                {journeys.map((j, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-xs font-medium">
                      {j.waitlist_signup_email.startsWith("user:") ? j.waitlist_signup_email : maskEmail(j.waitlist_signup_email)}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-muted-foreground">
                      {j.invited_at ? format(new Date(j.invited_at), "MMM d") : "—"}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-muted-foreground">
                      {j.activated_at ? format(new Date(j.activated_at), "MMM d") : "—"}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-muted-foreground">
                      {j.first_login_at ? format(new Date(j.first_login_at), "MMM d") : "—"}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-muted-foreground">
                      {j.first_capture_at ? format(new Date(j.first_capture_at), "MMM d") : "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {j.day2_retained ? <CheckCircle2 className="h-3 w-3 text-primary mx-auto" /> : <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {j.day7_retained ? <CheckCircle2 className="h-3 w-3 text-primary mx-auto" /> : <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
