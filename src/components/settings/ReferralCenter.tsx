import { useEffect, useState } from "react";
import { Gift, Copy, Share2, Sparkles, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface ReferralStats {
  referral_code: string | null;
  signups: number;
  activations: number;
  reward_level: number;
  next_milestone: string;
  progress_current: number;
  progress_target: number;
}

const REFERRAL_BASE = "https://insighthalo.com/join?ref=";

export function ReferralCenter() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_user_referral_stats" as never);
        if (cancelled) return;
        if (error) throw error;
        const row = data as unknown as ReferralStats;
        if (row && !("error" in (row as object))) setStats(row);
      } catch {
        // graceful: keep stats null
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const referralLink = stats?.referral_code ? `${REFERRAL_BASE}${stats.referral_code}` : null;

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  };

  const handleShare = async () => {
    if (!referralLink) return;
    const shareData = {
      title: "Join me on InsightHalo",
      text: "InsightHalo is my second brain — capture, organize, and remember everything. Join me:",
      url: referralLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(referralLink);
        toast.success("Link copied — share it anywhere");
      }
    } catch {
      // user canceled share — silent
    }
  };

  const progressPct = stats && stats.progress_target > 0
    ? Math.min(100, (stats.progress_current / stats.progress_target) * 100)
    : 0;

  const remaining = stats ? Math.max(0, stats.progress_target - stats.progress_current) : 0;

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" /> Referral Center
      </h2>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Share InsightHalo with friends. When they join using your link, your reward progress grows.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your referral stats…
        </div>
      ) : !referralLink ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground">
          No referral code yet. Once your account is fully set up, your personal link will appear here.
        </div>
      ) : (
        <>
          {/* Referral Link */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your referral link</p>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-xs font-mono truncate">
                {referralLink}
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" onClick={handleCopy}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button size="sm" className="gap-1.5 text-xs shrink-0" onClick={handleShare}>
                <Share2 className="h-3 w-3" /> Share
              </Button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Signed up" value={stats!.signups} />
            <StatTile label="Activated" value={stats!.activations} />
            <StatTile label="Reward level" value={stats!.reward_level} icon={<Sparkles className="h-3 w-3 text-primary" />} />
          </div>

          {/* Milestone card */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium">
                {stats!.signups === 0
                  ? "No referrals yet — share your link to start earning rewards."
                  : `${stats!.progress_current} of ${stats!.progress_target} friends joined`}
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {remaining > 0
                ? `Invite ${remaining} more to unlock: ${stats!.next_milestone}`
                : `Unlocked: ${stats!.next_milestone}`}
            </p>
          </div>

          {/* Milestone ladder */}
          <div className="grid gap-1.5 pt-1">
            <MilestoneRow target={1} current={stats!.signups} label="Early supporter badge" />
            <MilestoneRow target={3} current={stats!.signups} label="Extra AI usage credits" />
            <MilestoneRow target={5} current={stats!.signups} label="1 month Pro access" />
            <MilestoneRow target={10} current={stats!.signups} label="3 months Pro · Founder reward" />
          </div>
        </>
      )}
    </section>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 text-center space-y-0.5">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <p className="text-lg font-semibold leading-none">{value}</p>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function MilestoneRow({ target, current, label }: { target: number; current: number; label: string }) {
  const reached = current >= target;
  return (
    <div className="flex items-center justify-between text-[11px] py-1 px-2 rounded-md hover:bg-muted/30">
      <span className={reached ? "text-foreground" : "text-muted-foreground"}>
        {target} signup{target === 1 ? "" : "s"} · {label}
      </span>
      {reached ? (
        <Badge variant="default" className="text-[9px] px-1.5 py-0">Unlocked</Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground">{current}/{target}</span>
      )}
    </div>
  );
}
