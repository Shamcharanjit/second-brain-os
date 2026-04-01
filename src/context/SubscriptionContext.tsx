import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadState, saveState } from "@/lib/persistence";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import { isStripeEnabled } from "@/lib/stripe/config";

/* ── Plan types ── */
export type PlanTier = "free" | "pro";

interface PlanLimits {
  aiTriagePerDay: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { aiTriagePerDay: 5 },
  pro: { aiTriagePerDay: 999 },
};

interface UsageState {
  aiTriageUsedToday: number;
  aiTriageDateKey: string; // YYYY-MM-DD
}

export type SubscriptionStatus = "none" | "active" | "trialing" | "canceled" | "past_due" | "incomplete";

interface SubscriptionContextType {
  plan: PlanTier;
  isPro: boolean;
  limits: PlanLimits;
  aiTriageRemaining: number;
  aiTriageUsedToday: number;
  recordAITriageUse: () => void;
  canUseAITriage: boolean;
  shouldShowUpgradePrompt: boolean;
  /** True when Stripe billing is configured and available */
  billingEnabled: boolean;
  /** Backend subscription status if available */
  subscriptionStatus: SubscriptionStatus;
  /** When the current billing period ends */
  currentPeriodEnd: string | null;
  /** Loading backend subscription data */
  loadingSubscription: boolean;
  /** Dev-only: toggle plan for testing (only works when billing is NOT enabled) */
  setPlan: (p: PlanTier) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const USAGE_KEY = "insighthalo_ai_usage";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Backend subscription state
  const [backendPlan, setBackendPlan] = useState<PlanTier | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("none");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Local usage tracking (works for all users)
  const [usage, setUsage] = useState<UsageState>(() => {
    const saved = loadState<UsageState>(USAGE_KEY, { aiTriageUsedToday: 0, aiTriageDateKey: todayKey() });
    if (saved.aiTriageDateKey !== todayKey()) {
      return { aiTriageUsedToday: 0, aiTriageDateKey: todayKey() };
    }
    return saved;
  });

  useEffect(() => { saveState(USAGE_KEY, usage); }, [usage]);

  // Fetch backend subscription when user is authenticated
  useEffect(() => {
    if (!user || !isSupabaseEnabled) {
      setBackendPlan(null);
      setSubscriptionStatus("none");
      setCurrentPeriodEnd(null);
      return;
    }

    setLoadingSubscription(true);
    supabase
      .from("user_subscriptions")
      .select("plan_tier, subscription_status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBackendPlan(data.plan_tier as PlanTier);
          setSubscriptionStatus((data.subscription_status as SubscriptionStatus) || "none");
          setCurrentPeriodEnd(data.current_period_end || null);
        } else {
          // No subscription record yet — user is free
          setBackendPlan("free");
          setSubscriptionStatus("none");
          // Create initial subscription record
          supabase.from("user_subscriptions").insert({
            user_id: user.id,
            plan_tier: "free",
            subscription_status: "none",
          }).then(() => {});
        }
        setLoadingSubscription(false);
      });
  }, [user]);

  // Derive plan: backend is authoritative when available, else free
  const plan: PlanTier = backendPlan ?? "free";
  const isPro = plan === "pro" && (subscriptionStatus === "active" || subscriptionStatus === "trialing");
  const limits = PLAN_LIMITS[isPro ? "pro" : "free"];
  const billingEnabled = isStripeEnabled;

  const aiTriageRemaining = Math.max(0, limits.aiTriagePerDay - usage.aiTriageUsedToday);
  const canUseAITriage = aiTriageRemaining > 0;
  const shouldShowUpgradePrompt = !isPro && usage.aiTriageUsedToday >= limits.aiTriagePerDay;

  const recordAITriageUse = useCallback(() => {
    setUsage((prev) => {
      const key = todayKey();
      if (prev.aiTriageDateKey !== key) {
        return { aiTriageUsedToday: 1, aiTriageDateKey: key };
      }
      return { ...prev, aiTriageUsedToday: prev.aiTriageUsedToday + 1 };
    });
  }, []);

  // Dev-only plan toggle — only works when billing is NOT configured
  const setPlan = useCallback((p: PlanTier) => {
    if (billingEnabled) return; // No manual toggling when billing is live
    setBackendPlan(p);
  }, [billingEnabled]);

  return (
    <SubscriptionContext.Provider value={{
      plan: isPro ? "pro" : "free",
      isPro,
      limits,
      aiTriageRemaining,
      aiTriageUsedToday: usage.aiTriageUsedToday,
      recordAITriageUse,
      canUseAITriage,
      shouldShowUpgradePrompt,
      billingEnabled,
      subscriptionStatus,
      currentPeriodEnd,
      loadingSubscription,
      setPlan,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
