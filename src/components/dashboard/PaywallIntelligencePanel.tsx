import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles, RefreshCw, Loader2, ChevronDown, Eye, MousePointer, X as XIcon,
  TrendingUp, Globe, Users, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Variant = {
  id: string;
  variant_name: string;
  target_region: string;
  target_segment: string;
  min_readiness_score: number;
  allowed_prompt_strengths: string[];
  headline: string;
  subheadline: string;
  pricing_label: string;
  badge_text: string;
  cta_text: string;
  urgency_text: string;
  social_proof_text: string;
  show_discount_hint: boolean;
  discount_hint_text: string;
  show_feature_comparison: boolean;
  show_testimonial_block: boolean;
  priority_weight: number;
  is_active: boolean;
};

type PerfByVariant = { variant_name: string; variant_id: string; impressions: number; clicks: number; dismissals: number; ctr: number };
type PerfByRegion = { currency: string; impressions: number; clicks: number; ctr: number };
type Performance = {
  by_variant: PerfByVariant[];
  by_region: PerfByRegion[];
  best_variant: { variant_name: string; ctr: number } | null;
  today: { impressions: number; clicks: number; dismissals: number };
};

export default function PaywallIntelligencePanel() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Variant>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [vRes, pRes] = await Promise.all([
      supabase.from("paywall_variants" as any).select("*").order("priority_weight", { ascending: false }),
      supabase.rpc("get_paywall_variant_performance" as any),
    ]);
    if (vRes.data) setVariants(vRes.data as any);
    if (pRes.data) setPerformance(pRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("paywall_variants" as any).update({ is_active: !current } as any).eq("id", id);
    setVariants(prev => prev.map(v => v.id === id ? { ...v, is_active: !current } : v));
    toast.success(`Variant ${!current ? "activated" : "deactivated"}`);
  };

  const startEdit = (v: Variant) => {
    setEditingId(v.id);
    setEditForm({ headline: v.headline, subheadline: v.subheadline, cta_text: v.cta_text, min_readiness_score: v.min_readiness_score, priority_weight: v.priority_weight, target_region: v.target_region, target_segment: v.target_segment });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from("paywall_variants" as any).update(editForm as any).eq("id", editingId);
    setVariants(prev => prev.map(v => v.id === editingId ? { ...v, ...editForm } as Variant : v));
    setEditingId(null);
    toast.success("Variant updated");
  };

  const perf = performance;
  const today = perf?.today;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Paywall Intelligence</h3>
          <Badge variant="secondary" className="text-[10px]">{variants.filter(v => v.is_active).length} active</Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5 space-y-5">
          <div className="flex justify-end pt-3">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh
            </Button>
          </div>

          {/* Today stats */}
          {today && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> Impressions Today</div>
                <p className="text-xl font-bold">{today.impressions}</p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MousePointer className="h-3 w-3" /> Clicks Today</div>
                <p className="text-xl font-bold">{today.clicks}</p>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><XIcon className="h-3 w-3" /> Dismissed Today</div>
                <p className="text-xl font-bold">{today.dismissals}</p>
              </div>
            </div>
          )}

          {/* Best variant */}
          {perf?.best_variant?.variant_name && (
            <div className="flex items-center gap-2 text-xs rounded-lg bg-primary/5 border border-primary/10 p-3">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>Best: <span className="font-semibold text-foreground">{perf.best_variant.variant_name}</span> — {perf.best_variant.ctr}% CTR</span>
            </div>
          )}

          {/* By Region */}
          {perf?.by_region && perf.by_region.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold"><Globe className="h-3.5 w-3.5 text-muted-foreground" /> By Region</div>
              <div className="grid grid-cols-2 gap-2">
                {perf.by_region.map(r => (
                  <div key={r.currency} className="rounded-lg border p-2.5 text-xs space-y-0.5">
                    <span className="font-medium">{r.currency}</span>
                    <div className="text-muted-foreground">{r.impressions} views · {r.clicks} clicks · {r.ctr}% CTR</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variant performance */}
          {perf?.by_variant && perf.by_variant.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold"><Target className="h-3.5 w-3.5 text-muted-foreground" /> Variant Performance</div>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Variant</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">Views</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">Clicks</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">CTR</th>
                  </tr></thead>
                  <tbody>
                    {perf.by_variant.map(v => (
                      <tr key={v.variant_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{v.variant_name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{v.impressions}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{v.clicks}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">{v.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Variant management */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold"><Users className="h-3.5 w-3.5 text-muted-foreground" /> Manage Variants</div>
            <div className="space-y-2">
              {variants.map(v => (
                <div key={v.id} className={cn("rounded-lg border p-3 space-y-2", !v.is_active && "opacity-50")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{v.variant_name}</span>
                      <Badge variant="outline" className="text-[10px]">{v.target_region}</Badge>
                      <Badge variant="outline" className="text-[10px]">{v.target_segment}</Badge>
                      <Badge variant="secondary" className="text-[10px]">w:{v.priority_weight}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={v.is_active} onCheckedChange={() => toggleActive(v.id, v.is_active)} />
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => editingId === v.id ? setEditingId(null) : startEdit(v)}>
                        {editingId === v.id ? "Cancel" : "Edit"}
                      </Button>
                    </div>
                  </div>
                  {v.headline && <p className="text-[11px] text-muted-foreground">{v.headline}</p>}

                  {editingId === v.id && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Headline" className="h-7 text-xs" value={editForm.headline || ""} onChange={e => setEditForm(p => ({ ...p, headline: e.target.value }))} />
                        <Input placeholder="CTA Text" className="h-7 text-xs" value={editForm.cta_text || ""} onChange={e => setEditForm(p => ({ ...p, cta_text: e.target.value }))} />
                        <Input placeholder="Region" className="h-7 text-xs" value={editForm.target_region || ""} onChange={e => setEditForm(p => ({ ...p, target_region: e.target.value }))} />
                        <Input placeholder="Segment" className="h-7 text-xs" value={editForm.target_segment || ""} onChange={e => setEditForm(p => ({ ...p, target_segment: e.target.value }))} />
                        <Input type="number" placeholder="Min Score" className="h-7 text-xs" value={editForm.min_readiness_score ?? 0} onChange={e => setEditForm(p => ({ ...p, min_readiness_score: Number(e.target.value) }))} />
                        <Input type="number" placeholder="Priority" className="h-7 text-xs" value={editForm.priority_weight ?? 10} onChange={e => setEditForm(p => ({ ...p, priority_weight: Number(e.target.value) }))} />
                      </div>
                      <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>Save Changes</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
