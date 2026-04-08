import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  BarChart3, Loader2, TrendingUp, Zap, Award, UserCheck,
  ArrowUpRight, Lightbulb, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PromptEvent = {
  campaign_id: string;
  prompt_strength: string;
  prompt_type: string;
  event_type: string;
  created_at: string;
};

type Campaign = {
  id: string;
  campaign_name: string;
  target_segment: string[];
  prompt_strength: string;
};

type StrengthMetrics = {
  impressions: number;
  clicks: number;
  dismissals: number;
  ctr: number;
};

function CtrBadge({ ctr }: { ctr: number }) {
  const cls = ctr >= 20 ? "bg-primary/10 text-primary border-primary/20" :
    ctr >= 10 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
    ctr >= 5 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
    "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-bold tabular-nums", cls)}>
      {ctr.toFixed(1)}%
    </span>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const cls = level === "High" ? "bg-primary/10 text-primary border-primary/20" :
    level === "Moderate" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
    "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium", cls)}>
      {level}
    </span>
  );
}

function getConfidence(impressions: number, ctr: number): string {
  if (impressions >= 100 && ctr > 0) return "High";
  if (impressions >= 30) return "Moderate";
  return "Low";
}

export default function PromptExperimentationPanel() {
  const [events, setEvents] = useState<PromptEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [evRes, cRes] = await Promise.all([
        supabase.from("conversion_prompt_events" as any).select("campaign_id, prompt_strength, prompt_type, event_type, created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("conversion_campaigns" as any).select("id, campaign_name, target_segment, prompt_strength"),
      ]);
      if (!evRes.error) setEvents(evRes.data as any || []);
      if (!cRes.error) setCampaigns(cRes.data as any || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const campaignMap = useMemo(() => {
    const m: Record<string, Campaign> = {};
    campaigns.forEach(c => { m[c.id] = c; });
    return m;
  }, [campaigns]);

  /* ── per-campaign metrics ── */
  const campaignMetrics = useMemo(() => {
    const map: Record<string, { name: string; impressions: number; clicks: number; dismissals: number; ctr: number }> = {};
    for (const e of events) {
      if (!map[e.campaign_id]) {
        const c = campaignMap[e.campaign_id];
        map[e.campaign_id] = { name: c?.campaign_name || "Unknown", impressions: 0, clicks: 0, dismissals: 0, ctr: 0 };
      }
      const m = map[e.campaign_id];
      if (e.event_type === "shown") m.impressions++;
      else if (e.event_type === "clicked") m.clicks++;
      else if (e.event_type === "dismissed") m.dismissals++;
    }
    Object.values(map).forEach(m => { m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0; });
    return Object.entries(map).map(([id, m]) => ({ id, ...m }));
  }, [events, campaignMap]);

  /* ── strength comparison ── */
  const strengthMetrics = useMemo(() => {
    const map: Record<string, StrengthMetrics> = {
      soft: { impressions: 0, clicks: 0, dismissals: 0, ctr: 0 },
      standard: { impressions: 0, clicks: 0, dismissals: 0, ctr: 0 },
      strong: { impressions: 0, clicks: 0, dismissals: 0, ctr: 0 },
    };
    for (const e of events) {
      const s = e.prompt_strength;
      if (!map[s]) continue;
      if (e.event_type === "shown") map[s].impressions++;
      else if (e.event_type === "clicked") map[s].clicks++;
      else if (e.event_type === "dismissed") map[s].dismissals++;
    }
    Object.values(map).forEach(m => { m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0; });
    return map;
  }, [events]);

  const bestStrength = useMemo(() => {
    let best = "standard";
    let bestCtr = 0;
    for (const [k, v] of Object.entries(strengthMetrics)) {
      if (v.ctr > bestCtr && v.impressions >= 5) { best = k; bestCtr = v.ctr; }
    }
    return best;
  }, [strengthMetrics]);

  /* ── segment performance ── */
  const segmentMetrics = useMemo(() => {
    const segMap: Record<string, StrengthMetrics> = {};
    for (const e of events) {
      const c = campaignMap[e.campaign_id];
      if (!c) continue;
      for (const seg of c.target_segment) {
        if (!segMap[seg]) segMap[seg] = { impressions: 0, clicks: 0, dismissals: 0, ctr: 0 };
        if (e.event_type === "shown") segMap[seg].impressions++;
        else if (e.event_type === "clicked") segMap[seg].clicks++;
        else if (e.event_type === "dismissed") segMap[seg].dismissals++;
      }
    }
    Object.values(segMap).forEach(m => { m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0; });
    return segMap;
  }, [events, campaignMap]);

  const bestSegment = useMemo(() => {
    let best = "";
    let bestCtr = 0;
    for (const [k, v] of Object.entries(segmentMetrics)) {
      if (v.ctr > bestCtr && v.impressions >= 5) { best = k; bestCtr = v.ctr; }
    }
    return best;
  }, [segmentMetrics]);

  /* ── suggestions ── */
  const suggestions = useMemo(() => {
    const s: string[] = [];
    if (bestStrength && strengthMetrics[bestStrength]?.impressions >= 5) {
      s.push(`"${bestStrength}" prompts have the highest CTR (${strengthMetrics[bestStrength].ctr.toFixed(1)}%).`);
    }
    if (bestSegment && segmentMetrics[bestSegment]?.impressions >= 5) {
      s.push(`"${bestSegment.replace(/_/g, " ")}" segment converts best (${segmentMetrics[bestSegment].ctr.toFixed(1)}% CTR).`);
    }
    const worstStrength = Object.entries(strengthMetrics).sort((a, b) => a[1].ctr - b[1].ctr)[0];
    if (worstStrength && worstStrength[1].impressions >= 5 && worstStrength[0] !== bestStrength) {
      s.push(`Consider reducing "${worstStrength[0]}" prompt usage (${worstStrength[1].ctr.toFixed(1)}% CTR).`);
    }
    if (events.length < 30) {
      s.push("Need more data — at least 30 events recommended for reliable insights.");
    }
    return s;
  }, [bestStrength, bestSegment, strengthMetrics, segmentMetrics, events.length]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-1">
        <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No prompt events yet</p>
        <p className="text-[10px] text-muted-foreground/60">Activate a campaign to start collecting A/B data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Campaign Performance ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" /> Campaign Performance
        </h3>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Campaign</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Impressions</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Clicks</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Dismissed</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">CTR</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Confidence</th>
            </tr></thead>
            <tbody>
              {campaignMetrics.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-medium">{m.name}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-xs">{m.impressions}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-xs">{m.clicks}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-xs">{m.dismissals}</td>
                  <td className="px-3 py-2 text-center"><CtrBadge ctr={m.ctr} /></td>
                  <td className="px-3 py-2 text-center"><ConfidenceBadge level={getConfidence(m.impressions, m.ctr)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Strength Comparison ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" /> Prompt Strength Comparison
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(["soft", "standard", "strong"] as const).map(s => {
            const m = strengthMetrics[s];
            const isBest = s === bestStrength && m.impressions >= 5;
            return (
              <div key={s} className={cn("rounded-xl border p-4 space-y-2",
                isBest ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold capitalize">{s}</span>
                  {isBest && <span className="text-[10px] text-primary font-medium">⭐ Best</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <div>Impressions: <span className="font-bold text-foreground">{m.impressions}</span></div>
                  <div>Clicks: <span className="font-bold text-foreground">{m.clicks}</span></div>
                  <div>Dismissed: <span className="font-bold text-foreground">{m.dismissals}</span></div>
                  <div>CTR: <CtrBadge ctr={m.ctr} /></div>
                </div>
                <ConfidenceBadge level={getConfidence(m.impressions, m.ctr)} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Segment Performance ── */}
      {Object.keys(segmentMetrics).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" /> Segment-Level Performance
          </h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Segment</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Impressions</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Clicks</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">CTR</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Confidence</th>
              </tr></thead>
              <tbody>
                {Object.entries(segmentMetrics)
                  .sort((a, b) => b[1].ctr - a[1].ctr)
                  .map(([seg, m]) => (
                    <tr key={seg} className={cn("border-b last:border-0 hover:bg-muted/20",
                      seg === bestSegment && m.impressions >= 5 ? "bg-primary/5" : ""
                    )}>
                      <td className="px-3 py-2 text-xs font-medium capitalize">{seg.replace(/_/g, " ")}
                        {seg === bestSegment && m.impressions >= 5 && <span className="ml-1 text-[10px] text-primary">⭐</span>}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs">{m.impressions}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-xs">{m.clicks}</td>
                      <td className="px-3 py-2 text-center"><CtrBadge ctr={m.ctr} /></td>
                      <td className="px-3 py-2 text-center"><ConfidenceBadge level={getConfidence(m.impressions, m.ctr)} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Optimization Suggestions ── */}
      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-primary" /> Campaign Insights
          </h3>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <ShieldCheck className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground">{s}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
