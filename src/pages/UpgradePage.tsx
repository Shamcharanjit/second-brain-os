import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles, Check, ArrowRight, Brain, Shield, Zap, Crown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { isStripeEnabled } from "@/lib/stripe/config";
import { isRazorpayEnabled } from "@/lib/razorpay/config";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe/billing";
import { createRazorpaySubscription } from "@/lib/razorpay/billing";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/ga4";

const FREE_FEATURES = [
  "Unlimited captures & local storage",
  "Today, Inbox, Ideas Vault, Projects",
  "Review Rituals with streaks",
  "Full data export & backup",
  "Local-first privacy",
];

const PRO_FEATURES = [
  "Everything in Free",
  "More AI-powered triage per day",
  "AI-organized captures with confidence scores",
  "Priority AI processing",
  "Future: advanced insights & analytics",
  "Future: AI memory connections",
];

export default function UpgradePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plan, isPro, setPlan, billingEnabled, subscriptionStatus, loadingSubscription, billingRegion } = useSubscription();
  const { user } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const checkoutResult = searchParams.get("checkout");

  const handleUpgrade = async () => {
    trackEvent("upgrade_clicked", { region: billingRegion, signed_in: !!user, billing_enabled: billingEnabled });
    if (!user) {
      toast.info("Please sign in first to upgrade.");
      navigate("/auth");
      return;
    }

    if (!billingEnabled) {
      toast.info("Billing is not yet enabled. Keys must be configured by the admin.");
      return;
    }

    setCheckoutLoading(true);
    try {
      if (billingRegion === "india") {
        const result = await createRazorpaySubscription();
        if (result?.shortUrl) {
          window.location.href = result.shortUrl;
          return;
        }
        toast.error("Could not start Razorpay checkout. Please try again.");
      } else {
        const result = await createCheckoutSession();
        if (result?.url) {
          window.location.href = result.url;
          return;
        }
        toast.error("Could not start checkout. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Checkout failed.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (billingEnabled) {
      try {
        const result = await createPortalSession();
        if (result?.url) {
          window.location.href = result.url;
          return;
        }
        toast.info("Billing portal is not available yet.");
      } catch {
        toast.error("Could not open billing portal.");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/app")}>
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Dashboard
        </Button>
      </div>

      {/* Checkout result banners */}
      {checkoutResult === "success" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-1">
          <p className="text-sm font-medium text-primary">🎉 Welcome to Pro!</p>
          <p className="text-xs text-muted-foreground">Your subscription is being activated. It may take a moment to reflect.</p>
        </div>
      )}
      {checkoutResult === "canceled" && (
        <div className="rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">Checkout was canceled. No charges were made.</p>
        </div>
      )}

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">InsightHalo Pro</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Unlock the full power of your second brain with AI-powered intelligence.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Free */}
        <div className={`rounded-xl border p-6 space-y-4 ${!isPro ? "border-primary/30 bg-primary/5" : "bg-card"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Free</h2>
              {!isPro && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
            </div>
            <p className="text-2xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          </div>
          <ul className="space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className={`rounded-xl border p-6 space-y-4 ${isPro ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card border-primary/30"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Pro</h2>
              {isPro && <Badge className="text-[10px]">Current</Badge>}
            </div>
            <p className="text-2xl font-bold">
              {billingRegion === "india" ? "₹749" : "$9"}
              <span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            {!billingEnabled && (
              <p className="text-[10px] text-muted-foreground">Pricing coming soon</p>
            )}
          </div>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {loadingSubscription ? (
            <Button className="w-full" disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </Button>
          ) : !isPro ? (
            <Button className="w-full gap-2" onClick={handleUpgrade} disabled={checkoutLoading || !billingEnabled}>
              {checkoutLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout…</>
              ) : billingEnabled ? (
                <><Sparkles className="h-4 w-4" /> Upgrade to Pro</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Billing not yet enabled</>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              {billingEnabled && (
                <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleManageSubscription}>
                  Manage Subscription
                </Button>
              )}
            </div>
          )}

          {!billingEnabled && (
            <p className="text-[10px] text-center text-muted-foreground">
              Payment processing will be enabled soon.
            </p>
          )}
        </div>
      </div>

      {/* Trust section */}
      <div className="rounded-xl border border-dashed bg-muted/30 p-5 max-w-2xl mx-auto space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Your data stays yours</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          InsightHalo is local-first. Free or Pro, your data is always exportable, always private, and never locked in. Upgrading enhances intelligence — it never restricts access to your own knowledge.
        </p>
      </div>
    </div>
  );
}
