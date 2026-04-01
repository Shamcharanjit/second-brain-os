import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadState, saveState } from "@/lib/persistence";

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

interface SubscriptionContextType {
  plan: PlanTier;
  isPro: boolean;
  limits: PlanLimits;
  aiTriageRemaining: number;
  aiTriageUsedToday: number;
  recordAITriageUse: () => void;
  canUseAITriage: boolean;
  shouldShowUpgradePrompt: boolean;
  /** Dev-only: toggle plan for testing */
  setPlan: (p: PlanTier) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const STORAGE_KEY = "insighthalo_subscription";
const USAGE_KEY = "insighthalo_ai_usage";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<PlanTier>(() => loadState(STORAGE_KEY, "free") as PlanTier);
  const [usage, setUsage] = useState<UsageState>(() => {
    const saved = loadState<UsageState>(USAGE_KEY, { aiTriageUsedToday: 0, aiTriageDateKey: todayKey() });
    // Reset if day changed
    if (saved.aiTriageDateKey !== todayKey()) {
      return { aiTriageUsedToday: 0, aiTriageDateKey: todayKey() };
    }
    return saved;
  });

  useEffect(() => { saveState(STORAGE_KEY, plan); }, [plan]);
  useEffect(() => { saveState(USAGE_KEY, usage); }, [usage]);

  const limits = PLAN_LIMITS[plan];
  const isPro = plan === "pro";

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

  const setPlan = useCallback((p: PlanTier) => {
    setPlanState(p);
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      plan, isPro, limits,
      aiTriageRemaining, aiTriageUsedToday: usage.aiTriageUsedToday,
      recordAITriageUse, canUseAITriage, shouldShowUpgradePrompt,
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
