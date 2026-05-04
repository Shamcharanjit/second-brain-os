/**
 * ReferralPage — /referral
 *
 * Dedicated full-page referral hub. Surfaces the user's referral link,
 * live stats, milestone ladder, and how-it-works guide.
 * Uses the same get_user_referral_stats RPC as ReferralCenter in Settings.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gift, Copy, Share2, Sparkles, Trophy, Loader2, Check,
  Users, ArrowRight, Star, Rocket, Crown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Milestone ladder ──────────────────────────────────────────────────────────

const MILESTONES = [
  { target: 1,  icon: Star,    label: "Early Supporter Badge",       desc: "Get a special badge on your profile" },
  { target: 3,  icon: Sparkles,label: "Extra AI Usage Credits",      desc: "More AI captures per day" },
  { target: 5,  icon: Crown,   label: "1 Month Pro — Free",          desc: "Full Pro access, no card needed" },
  { target: 10, icon: Rocket,  label: "3 Months Pro · Founder Reward", desc: "Lifetime Founder status + Pro for 3 months" },
];

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  { n: "1", text: "Copy your unique referral link below" },
  { n: "2", text: "Share it with friends, colleagues, or on socials" },
  { n: "3", text: "They sign up using your link" },
  { n: "4", text: "You move up the waitlist + unlock rewards" },
];

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center space-y-1">
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MilestoneRow({ target, current, icon: Icon, label, desc }: {
  target: number; current: number; icon: React.ComponentType<{ className?: string }>; label: string; desc: string;
}) {
  const reached = current >= target;
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${reached ? "border-primary/30 bg-primary/5" : "bg-card"}`}>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {reached ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${reached ? "text-primary" : ""}`}>{label}</p>
          {reached && <Badge className="text-[9px] h-4 px-1.5">Unlocked</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${reached ? "text-primary" : "text-muted-foreground"}`}>
          {Math.min(current, target)}/{target}
        </p>
        <p className="text-[10px] text-muted-foreground">referrals</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_user_referral_stats" as never);
        if (error) throw error;
        const row = data as unknown as ReferralStats;
        if (row && !("error" in (row as object))) setStats(row);
      } catch {
        // graceful — keep stats null
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const referralLink = stats?.referral_code ? `${REFERRAL_BASE}${stats.referral_code}` : null;

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!referralLink) return;
    const shareData = {
      title: "Join me on InsightHalo",
      text: "InsightHalo is my AI-powered second brain. Join me and stop losing ideas:",
      url: referralLink,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(referralLink); toast.success("Link copied — share it anywhere!"); }
    } catch { /* user cancelled */ }
  }

  const progressPct = stats && stats.progress_target > 0
    ? Math.min(100, (stats.progress_current / stats.progress_target) * 100)
    : 0;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Gift className="h-14 w-14 text-muted-foreground/30" />
        <p className="text-lg font-semibold">Sign in to access your referral dashboard</p>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Gift className="h-4 w-4" /> Referral Dashboard
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Invite friends. Earn rewards.</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Every friend who joins using your link moves you up the waitlist and unlocks exclusive rewards — Pro access, credits, and Founder status.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your stats…
        </div>
      ) : !referralLink ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center space-y-2">
          <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium">No referral code yet</p>
          <p className="text-xs text-muted-foreground">Your personal link will appear here once your account is fully set up.</p>
        </div>
      ) : (
        <>
          {/* Referral link card */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">Your unique referral link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2.5 text-xs font-mono truncate">
                {referralLink}
              </code>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Signed up" value={stats!.signups} sub="via your link" />
            <StatCard label="Activated" value={stats!.activations} sub="completed setup" />
            <StatCard label="Reward level" value={stats!.reward_level} sub="current tier" />
          </div>

          {/* Progress to next milestone */}
          {stats!.progress_target > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Next reward</p>
                </div>
                <span className="text-xs text-muted-foreground">{stats!.progress_current}/{stats!.progress_target} referrals</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {stats!.progress_current >= stats!.progress_target
                  ? `🎉 Unlocked: ${stats!.next_milestone}`
                  : `${stats!.progress_target - stats!.progress_current} more referral${stats!.progress_target - stats!.progress_current !== 1 ? "s" : ""} to unlock: ${stats!.next_milestone}`}
              </p>
            </div>
          )}

          {/* Milestone ladder */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reward milestones</p>
            {MILESTONES.map((m) => (
              <MilestoneRow
                key={m.target}
                target={m.target}
                current={stats!.signups}
                icon={m.icon}
                label={m.label}
                desc={m.desc}
              />
            ))}
          </section>
        </>
      )}

      {/* How it works */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> How it works
        </p>
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                {s.n}
              </div>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Share suggestion */}
      {referralLink && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Ready to share?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Drop your link in a group chat, tweet it, or send it directly.</p>
          </div>
          <Button className="gap-1.5 shrink-0" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Share now
          </Button>
        </div>
      )}
    </div>
  );
}
