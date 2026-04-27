import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type PlanTier = "anon" | "free" | "pro" | "early_access";

export interface Entitlements {
  tier: PlanTier;
  ai_organize_per_day: number; // -1 = unlimited
  ai_triage_auto: boolean;
  multi_device_sync: boolean;
  semantic_search: boolean;
  resurfacing: boolean;
  weekly_digest: boolean;
  email_to_capture: boolean;
  chrome_extension: boolean;
  priority_support: boolean;
  voice_capture: boolean;
  export_json: boolean;
  enforce_limits: boolean;
  early_access_member?: boolean;
}

export interface TodayUsage {
  ai_organize_count: number;
  ai_triage_count: number;
  voice_seconds: number;
}

const DEFAULT_FREE: Entitlements = {
  tier: "free",
  ai_organize_per_day: 3,
  ai_triage_auto: false,
  multi_device_sync: false,
  semantic_search: false,
  resurfacing: false,
  weekly_digest: false,
  email_to_capture: false,
  chrome_extension: false,
  priority_support: false,
  voice_capture: true,
  export_json: true,
  enforce_limits: false,
};

export function useEntitlements() {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_FREE);
  const [usage, setUsage] = useState<TodayUsage>({
    ai_organize_count: 0,
    ai_triage_count: 0,
    voice_seconds: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseEnabled || !user) {
      setEntitlements(DEFAULT_FREE);
      setUsage({ ai_organize_count: 0, ai_triage_count: 0, voice_seconds: 0 });
      setLoading(false);
      return;
    }
    try {
      const [{ data: ent }, { data: use }] = await Promise.all([
        supabase.rpc("get_user_entitlements"),
        supabase.rpc("get_today_usage"),
      ]);
      if (ent) setEntitlements({ ...DEFAULT_FREE, ...(ent as Entitlements) });
      if (use) setUsage(use as TodayUsage);
    } catch (err) {
      // Fail open — never block the user from using the app
      console.warn("[entitlements] refresh failed", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPro =
    entitlements.tier === "pro" || entitlements.tier === "early_access";

  const canUseFeature = (
    key: keyof Entitlements,
  ): boolean => Boolean(entitlements[key]);

  const aiOrganizeRemaining = (() => {
    if (entitlements.ai_organize_per_day === -1) return Infinity;
    if (!entitlements.enforce_limits) return Infinity;
    return Math.max(
      entitlements.ai_organize_per_day - usage.ai_organize_count,
      0,
    );
  })();

  return {
    entitlements,
    usage,
    loading,
    refresh,
    isPro,
    canUseFeature,
    aiOrganizeRemaining,
  };
}

/**
 * Atomically attempts to consume one quota unit.
 * Returns { allowed, remaining, limit, reason }.
 * Frontend should call this BEFORE invoking the AI edge function.
 */
export async function tryConsumeAiQuota(
  feature: "ai_organize" | "ai_triage" = "ai_organize",
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason: string | null;
}> {
  if (!isSupabaseEnabled) {
    return { allowed: true, remaining: -1, limit: -1, reason: null };
  }
  const { data, error } = await supabase.rpc("try_consume_ai_quota", {
    p_feature: feature,
  });
  if (error || !data) {
    // Fail open — don't block users on RPC errors
    return { allowed: true, remaining: -1, limit: -1, reason: null };
  }
  return data as {
    allowed: boolean;
    remaining: number;
    limit: number;
    reason: string | null;
  };
}
