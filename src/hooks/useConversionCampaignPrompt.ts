import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";

type PromptStrength = "soft" | "standard" | "strong" | null;
type PromptType = "badge" | "banner" | "modal";

interface CampaignPromptState {
  shouldShow: boolean;
  strength: PromptStrength;
  campaignId: string | null;
  campaignName: string | null;
  promptType: PromptType | null;
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
  });

  useEffect(() => {
    if (!user || isPro) {
      setState({ shouldShow: false, strength: null, campaignId: null, campaignName: null, promptType: null });
      return;
    }

    const check = async () => {
      const { data: campaigns } = await supabase
        .from("conversion_campaigns" as any)
        .select("*")
        .eq("is_active", true);

      if (!campaigns || campaigns.length === 0) {
        setState({ shouldShow: false, strength: null, campaignId: null, campaignName: null, promptType: null });
        return;
      }

      const { data: sub } = await supabase
        .from("user_subscriptions" as any)
        .select("conversion_readiness_score, upgrade_prompt_eligible")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!sub) {
        setState({ shouldShow: false, strength: null, campaignId: null, campaignName: null, promptType: null });
        return;
      }

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

      setState({
        shouldShow: bestStrength !== null,
        strength: bestStrength,
        campaignId: bestId,
        campaignName: bestName,
        promptType: bestStrength ? strengthToType[bestStrength] || "banner" : null,
      });
    };

    check();
  }, [user, isPro]);

  const trackEvent = useCallback((eventType: "shown" | "clicked" | "dismissed") => {
    if (!user || !state.campaignId || !state.strength || !state.promptType) return;
    const key = `${state.campaignId}-${eventType}`;
    if (eventType === "shown" && trackedRef.current.has(key)) return;
    trackedRef.current.add(key);

    supabase.from("conversion_prompt_events" as any).insert({
      user_id: user.id,
      campaign_id: state.campaignId,
      prompt_strength: state.strength,
      prompt_type: state.promptType,
      event_type: eventType,
    } as any).then(() => {});
  }, [user, state.campaignId, state.strength, state.promptType]);

  return { ...state, trackEvent };
}
