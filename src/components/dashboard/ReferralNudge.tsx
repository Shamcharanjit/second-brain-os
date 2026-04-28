/**
 * ReferralNudge
 *
 * Compact referral card for the Dashboard.
 * Shows the user's referral link with copy + share buttons.
 * Only renders when the user has a referral code (activated users).
 * Dismissable per session — won't show again until next page load.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Copy, Share2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

const REFERRAL_BASE = "https://insighthalo.com/join?ref=";

export default function ReferralNudge() {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("get_user_referral_stats" as never);
        if (cancelled) return;
        const row = data as any;
        if (row?.referral_code) {
          setReferralCode(row.referral_code);
          setReferralCount(row.signups ?? 0);
        }
      } catch {
        // silent — referral feature is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !referralCode || dismissed) return null;

  const link = `${REFERRAL_BASE}${referralCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const handleShare = async () => {
    const shareData = {
      title: "Join me on InsightHalo",
      text: "My AI second brain for capturing and organizing everything. Join here:",
      url: link,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied — share it anywhere");
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {referralCount === 0
                ? "Invite friends, earn rewards"
                : `${referralCount} friend${referralCount > 1 ? "s" : ""} joined — keep going!`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {referralCount === 0
                ? "Share your link — 5 referrals unlocks 1 month Pro free."
                : `${Math.max(0, 5 - referralCount)} more to unlock 1 month Pro free.`}
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex-1 rounded-md border bg-background/60 px-3 py-1.5 text-[11px] font-mono truncate text-muted-foreground">
          {link}
        </div>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-8 shrink-0" onClick={handleCopy}>
          <Copy className="h-3 w-3" /> Copy
        </Button>
        <Button size="sm" className="gap-1 text-xs h-8 shrink-0" onClick={handleShare}>
          <Share2 className="h-3 w-3" /> Share
        </Button>
      </div>

      <button onClick={() => navigate("/settings")} className="text-[11px] text-primary hover:underline flex items-center gap-1">
        View full referral stats <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
