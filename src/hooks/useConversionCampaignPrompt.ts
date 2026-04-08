import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";

type PromptStrength = "soft" | "standard" | "strong" | null;

interface CampaignPromptState {
  shouldShow: boolean;
  strength: PromptStrength;
  campaignName: string | null;
}

/**
 * Hook to determine if the current user should see an upgrade prompt
 * based on active conversion campaigns and their eligibility.
 */
export function useConversionCampaignPrompt(): CampaignPromptState {
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const [state, setState] = useState<CampaignPromptState>({
    shouldShow: false,
    strength: null,
    campaignName: null,
  });

  useEffect(() => {
    if (!user || isPro) {
      setState({ shouldShow: false, strength: null, campaignName: null });
      return;
    }

    const check = async () => {
      // Get active campaigns
      const { data: campaigns } = await supabase
        .from("conversion_campaigns" as any)
        .select("*")
        .eq("is_active", true);

      if (!campaigns || campaigns.length === 0) {
        setState({ shouldShow: false, strength: null, campaignName: null });
        return;
      }

      // Get user's subscription data
      const { data: sub } = await supabase
        .from("user_subscriptions" as any)
        .select("conversion_readiness_score, upgrade_prompt_eligible")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!sub) {
        setState({ shouldShow: false, strength: null, campaignName: null });
        return;
      }

      const score = (sub as any).conversion_readiness_score || 0;
      const eligible = (sub as any).upgrade_prompt_eligible || false;

      // Find the strongest matching campaign
      let bestStrength: PromptStrength = null;
      let bestName: string | null = null;
      const strengthOrder = { soft: 1, standard: 2, strong: 3 };

      for (const c of campaigns as any[]) {
        // Check end date
        if (c.end_date && new Date(c.end_date) < new Date()) continue;
        // Check score threshold
        if (score < c.min_score_threshold) continue;
        // Check eligibility
        if (!eligible && c.min_score_threshold >= 60) continue;

        const s = c.prompt_strength as PromptStrength;
        if (!bestStrength || (s && strengthOrder[s] > strengthOrder[bestStrength])) {
          bestStrength = s;
          bestName = c.campaign_name;
        }
      }

      setState({
        shouldShow: bestStrength !== null,
        strength: bestStrength,
        campaignName: bestName,
      });
    };

    check();
  }, [user, isPro]);

  return state;
}
