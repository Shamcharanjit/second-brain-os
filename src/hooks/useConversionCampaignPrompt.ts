import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";

type PromptStrength = "soft" | "standard" | "strong" | null;
type PromptType = "badge" | "banner" | "modal";
type TriggerSource = "campaign" | "rule" | "readiness";

interface CampaignPromptState {
  shouldShow: boolean;
  strength: PromptStrength;
  campaignId: string | null;
  campaignName: string | null;
  promptType: PromptType | null;
  triggerSource: TriggerSource | null;
  trackEvent: (eventType: "shown" | "clicked" | "dismissed") => void;
}

export function useConversionCampaignPrompt(): CampaignPromptState {
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const trackedRef = useRef<Set<string>>(new Set());
  const [state, setState] = useState<Omit<CampaignPromptState, "trackEvent">>({
    shouldShow: false,
    strength: null,
    campaignId: null,
    campaignName: null,
    promptType: null,
    triggerSource: null,
  });

  useEffect(() => {
    if (!user || isPro) {
      setState({ shouldShow: false, strength: null, campaignId: null, campaignName: null, promptType: null, triggerSource: null });
      return;
    }

    const check = async () => {
      // Priority 1: Manual campaign prompt
      const { data: campaigns } = await supabase
        .from("conversion_campaigns" as any)
        .select("*")
        .eq("is_active", true);

      if (campaigns && campaigns.length > 0) {
        const { data: sub } = await supabase
          .from("user_subscriptions" as any)
          .select("conversion_readiness_score, upgrade_prompt_eligible")
          .eq("user_id", user.id)
          .maybeSingle();

        if (sub) {
          const score = (sub as any).conversion_readiness_score || 0;
          const eligible = (sub as any).upgrade_prompt_eligible || false;
          const strengthOrder = { soft: 1, standard: 2, strong: 3 };
          const strengthToType: Record<string, PromptType> = { soft: "badge", standard: "banner", strong: "modal" };

          let bestStrength: PromptStrength = null;
          let bestId: string | null = null;
          let bestName: string | null = null;

          for (const c of campaigns as any[]) {
            if (c.end_date && new Date(c.end_date) < new Date()) continue;
            if (score < c.min_score_threshold) continue;
            if (!eligible && c.min_score_threshold >= 60) continue;

            const s = c.prompt_strength as PromptStrength;
            if (!bestStrength || (s && strengthOrder[s] > strengthOrder[bestStrength])) {
              bestStrength = s;
              bestId = c.id;
              bestName = c.campaign_name;
            }
          }

          if (bestStrength) {
            setState({
              shouldShow: true,
              strength: bestStrength,
              campaignId: bestId,
              campaignName: bestName,
              promptType: bestStrength ? strengthToType[bestStrength] || "banner" : null,
              triggerSource: "campaign",
            });
            return;
          }
        }
      }

      // Priority 2 removed for now: get_upgrade_prompt_decision may not be
      // deployed in some environments. Fall back directly to readiness logic
      // without making the RPC call or surfacing 404 noise.

      // Priority 3: Readiness badge fallback
      const { data: sub } = await supabase
        .from("user_subscriptions" as any)
        .select("conversion_readiness_score, upgrade_prompt_eligible")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub && (sub as any).upgrade_prompt_eligible && (sub as any).conversion_readiness_score >= 50) {
        setState({
          shouldShow: true,
          strength: "soft",
          campaignId: null,
          campaignName: "Readiness Signal",
          promptType: "badge",
          triggerSource: "readiness",
        });
        return;
      }

      setState({ shouldShow: false, strength: null, campaignId: null, campaignName: null, promptType: null, triggerSource: null });
    };

    check();
  }, [user, isPro]);

  const trackEvent = useCallback((eventType: "shown" | "clicked" | "dismissed") => {
    if (!user || !state.strength || !state.promptType) return;
    const key = `${state.campaignId || state.triggerSource}-${eventType}`;
    if (eventType === "shown" && trackedRef.current.has(key)) return;
    trackedRef.current.add(key);

    supabase.from("conversion_prompt_events" as any).insert({
      user_id: user.id,
      campaign_id: state.campaignId,
      prompt_strength: state.strength,
      prompt_type: state.promptType,
      event_type: eventType,
      trigger_source: state.triggerSource || "campaign",
    } as any).then(() => {});

    // Also log to upgrade_prompt_history for rule-based triggers
    if (state.triggerSource === "rule" && eventType === "shown") {
      supabase.from("upgrade_prompt_history" as any).insert({
        user_id: user.id,
        prompt_type: state.promptType,
        prompt_strength: state.strength,
      } as any).then(() => {});
    }
  }, [user, state.campaignId, state.strength, state.promptType, state.triggerSource]);

  return { ...state, trackEvent };
}
