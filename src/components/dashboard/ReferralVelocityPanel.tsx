import { useMemo } from "react";
import {
  Flame, Zap, TrendingUp, Users, BarChart3, Star, Minus,
  ArrowUpRight, ArrowDownRight, Clock, UserCheck, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subHours, subDays, isAfter, differenceInDays, format } from "date-fns";

/* ── types ── */

type WaitlistEntry = {
  id: string;
  status: string;
  invited: boolean;
  invite_sent_at: string | null;
  invite_opened_at: string | null;
  invite_accepted_at: string | null;
  activation_completed_at: string | null;
  referral_code: string | null;
  referral_count: number;
  referral_reward_level: number;
  referred_by: string | null;
  email: string;
  name: string;
  created_at: string;
};

type Props = {
  waitlist: WaitlistEntry[];
};

/* ── helpers ── */

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "***@" + domain;
}

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

function MetricCard({ label, value, icon: Icon, subtitle, accent }: {
  label: string; value: string | number; icon: React.ElementType; subtitle?: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={cn("h-3.5 w-3.5", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className={cn("text-2xl font-bold tracking-tight", accent ? "text-primary" : "text-foreground")}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

const REWARD_LABELS: Record<number, string> = {
  1: "Priority",
  3: "Fast-track",
  5: "Early Access",
  10: "Insider",
};

/* ── main component ── */

export default function ReferralVelocityPanel({ waitlist }: Props) {
  const velocity = useMemo(() => {
    const now = new Date();
    const h24 = subHours(now, 24);
    const h48 = subHours(now, 48);
    const d7 = subDays(now, 7);
    const d14 = subDays(now, 14);

    const totalRefs = waitlist.reduce((sum, e) => sum + e.referral_count, 0);
    const refs24h = waitlist.filter((e) => e.referred_by && isAfter(new Date(e.created_at), h24)).length;
    const refsPrev24h = waitlist.filter((e) => e.referred_by && isAfter(new Date(e.created_at), h48) && !isAfter(new Date(e.created_at), h24)).length;
    const refs7d = waitlist.filter((e) => e.referred_by && isAfter(new Date(e.created_at), d7)).length;
    const refsPrev7d = waitlist.filter((e) => e.referred_by && isAfter(new Date(e.created_at), d14) && !isAfter(new Date(e.created_at), d7)).length;

    const invitedCount = waitlist.filter((e) => e.invited).length;
    const avgPerInvited = invitedCount > 0 ? (totalRefs / invitedCount).toFixed(1) : "0";

    const viralAccelerating = refs24h > refsPrev24h;
    const weekTrend: "up" | "down" | "stable" = refs7d > refsPrev7d ? "up" : refs7d < refsPrev7d ? "down" : "stable";

    // Funnel: shared → opened → accepted → activated (from referred users)
    const referred = waitlist.filter((e) => e.referred_by);
    const referredInvited = referred.filter((e) => e.invited).length;
    const referredOpened = referred.filter((e) => e.invite_opened_at).length;
    const referredAccepted = referred.filter((e) => e.invite_accepted_at).length;
    const referredActivated = referred.filter((e) => e.activation_completed_at).length;

    // Leaderboard
    const topReferrers = [...waitlist]
      .filter((e) => e.referral_count > 0)
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        name: e.name,
        email: maskEmail(e.email),
        referral_count: e.referral_count,
        reward_level: e.referral_reward_level,
        isFastTrack: e.referral_reward_level >= 3,
        activated: !!e.activation_completed_at,
      }));

    // Daily breakdown (last 7 days)
    const dailyRefs: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const count = waitlist.filter((e) => e.referred_by && format(new Date(e.created_at), "yyyy-MM-dd") === dayStr).length;
      dailyRefs.push({ date: format(day, "EEE"), count });
    }
    const maxDaily = Math.max(...dailyRefs.map((d) => d.count), 1);

    return {
      refs24h, refsPrev24h, refs7d, refsPrev7d, totalRefs, avgPerInvited,
      viralAccelerating, weekTrend, referred: referred.length,
      referredInvited, referredOpened, referredAccepted, referredActivated,
      topReferrers, dailyRefs, maxDaily,
    };
  }, [waitlist]);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Flame className="h-4 w-4" /> Referral Velocity Engine
      </h2>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          label="Referrals (24h)"
          value={velocity.refs24h}
          icon={Zap}
          accent
          subtitle={velocity.viralAccelerating ? "🔥 Accelerating" : `Yesterday: ${velocity.refsPrev24h}`}
        />
        <MetricCard label="Referrals (7d)" value={velocity.refs7d} icon={TrendingUp} subtitle={`Prior 7d: ${velocity.refsPrev7d}`} />
        <MetricCard label="Total Referrals" value={velocity.totalRefs} icon={Users} />
        <MetricCard label="Avg / Invited" value={velocity.avgPerInvited} icon={BarChart3} />
        <div className={cn(
          "rounded-xl border p-4 space-y-1.5",
          velocity.viralAccelerating ? "border-primary/30 bg-primary/5" : "border-border bg-card"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Viral Signal</span>
            {velocity.viralAccelerating ? <Flame className="h-3.5 w-3.5 text-primary" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <p className={cn("text-2xl font-bold", velocity.viralAccelerating ? "text-primary" : "text-muted-foreground")}>
            {velocity.viralAccelerating ? "Accelerating" : "Stable"}
          </p>
          <div className="flex items-center gap-1">
            <TrendBadge direction={velocity.weekTrend} />
            <span className="text-[10px] text-muted-foreground">7d trend</span>
          </div>
        </div>
      </div>

      {/* ── Referral Funnel ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Referred User Funnel</p>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: "Referred", value: velocity.referred, icon: Link2 },
            { label: "Invited", value: velocity.referredInvited, icon: Users },
            { label: "Opened", value: velocity.referredOpened, icon: Clock },
            { label: "Accepted", value: velocity.referredAccepted, icon: UserCheck },
            { label: "Activated", value: velocity.referredActivated, icon: Zap },
          ].map((step, i) => (
            <div key={step.label} className="space-y-1">
              <step.icon className="h-3.5 w-3.5 text-primary mx-auto" />
              <p className="text-lg font-bold tabular-nums">{step.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{step.label}</p>
              {i > 0 && velocity.referred > 0 && (
                <p className="text-[10px] font-semibold text-primary">
                  {Math.round((step.value / velocity.referred) * 100)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily Referral Chart ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Daily Referral Volume (7d)</p>
        <div className="flex items-end gap-1.5 h-16">
          {velocity.dailyRefs.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold tabular-nums text-muted-foreground">{d.count || ""}</span>
              <div
                className="w-full rounded-t bg-primary/80 transition-all"
                style={{ height: `${Math.max((d.count / velocity.maxDaily) * 48, d.count > 0 ? 4 : 1)}px` }}
              />
              <span className="text-[9px] text-muted-foreground">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ── */}
      {velocity.topReferrers.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Referral Leaderboard</span>
            <span className="text-[10px] text-muted-foreground">{velocity.topReferrers.length} referrers</span>
          </div>
          <div className="divide-y divide-border">
            {velocity.topReferrers.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-xs font-medium">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.email}</span>
                  {r.activated && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Active</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary tabular-nums">{r.referral_count}</span>
                  {r.reward_level >= 1 && (
                    <span className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                      r.isFastTrack ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                    )}>
                      {r.isFastTrack && <Star className="h-2 w-2" />}
                      {REWARD_LABELS[r.reward_level] || `Lvl ${r.reward_level}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
