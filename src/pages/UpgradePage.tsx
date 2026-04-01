import { useNavigate } from "react-router-dom";
import {
  Sparkles, Check, ArrowRight, Brain, Shield, Zap, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/context/SubscriptionContext";

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
  const { plan, isPro, setPlan } = useSubscription();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/")}>
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Dashboard
        </Button>
      </div>

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
        <div className={`rounded-xl border p-6 space-y-4 ${plan === "free" ? "border-primary/30 bg-primary/5" : "bg-card"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Free</h2>
              {plan === "free" && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
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
        <div className={`rounded-xl border p-6 space-y-4 ${plan === "pro" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card border-primary/30"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Pro</h2>
              {plan === "pro" && <Badge className="text-[10px]">Current</Badge>}
            </div>
            <p className="text-2xl font-bold">$9<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            <p className="text-[10px] text-muted-foreground">Pricing coming soon</p>
          </div>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {!isPro ? (
            <Button className="w-full gap-2" onClick={() => setPlan("pro")}>
              <Sparkles className="h-4 w-4" /> Upgrade to Pro
            </Button>
          ) : (
            <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={() => setPlan("free")}>
              Switch to Free
            </Button>
          )}
          <p className="text-[10px] text-center text-muted-foreground">
            Billing integration coming soon. Toggle for testing.
          </p>
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
