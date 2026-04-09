import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, RefreshCw, Loader2, Play, Pause, ChevronUp, ChevronDown,
  Target, BarChart3, Eye, MousePointerClick, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PromptRule = {
  id: string;
  rule_name: string;
  min_readiness_score: number;
  min_capture_count: number;
  min_project_count: number;
  min_memory_count: number;
  min_referral_count: number;
  require_recent_activity: boolean;
  recent_activity_window_hours: number;
  allowed_plan_tiers: string[];
  prompt_strength: string;
  prompt_type: string;
  cooldown_hours: number;
  priority_weight: number;
  is_active: boolean;
};

type PerformanceSummary = {
  by_source: { trigger_source: string; shown: number; clicked: number; dismissed: number; conversion_rate: number }[];
  by_strength: { prompt_strength: string; shown: number; clicked: number; conversion_rate: number }[];
  best_rule: { rule_name: string; triggers: number; clicks: number } | null;
  today: { shown: number; clicked: number; dismissed: number };
};

export default function UpgradeTimingPanel() {
  const [rules, setRules] = useState<PromptRule[]>([]);
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PromptRule>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [rulesRes, perfRes] = await Promise.all([
      supabase.from("upgrade_prompt_rules" as any).select("*").order("priority_weight", { ascending: false }),
      supabase.rpc("get_prompt_performance_summary" as any),
    ]);
    if (rulesRes.data) setRules(rulesRes.data as any[]);
    if (perfRes.data) setPerformance(perfRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("upgrade_prompt_rules" as any).update({ is_active: !current } as any).eq("id", id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
    toast.success(`Rule ${!current ? "activated" : "deactivated"}`);
  };

  const startEdit = (rule: PromptRule) => {
    setEditingId(rule.id);
    setEditValues({
      min_readiness_score: rule.min_readiness_score,
      min_capture_count: rule.min_capture_count,
      min_project_count: rule.min_project_count,
      min_memory_count: rule.min_memory_count,
      min_referral_count: rule.min_referral_count,
      cooldown_hours: rule.cooldown_hours,
      priority_weight: rule.priority_weight,
      prompt_strength: rule.prompt_strength,
      prompt_type: rule.prompt_type,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from("upgrade_prompt_rules" as any).update(editValues as any).eq("id", editingId);
    setRules(prev => prev.map(r => r.id === editingId ? { ...r, ...editValues } as PromptRule : r));
    setEditingId(null);
    toast.success("Rule updated");
  };

  const today = performance?.today;

  return (
    <div className="space-y-6">
      {/* ═══ AUTOMATIC UPGRADE ENGINE STATS ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4" /> Automatic Upgrade Engine
          </h2>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh
          </Button>
        </div>

        {/* Today stats */}
        {today && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Shown Today</span>
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{today.shown}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Clicked Today</span>
                <MousePointerClick className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary tabular-nums">{today.clicked}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Dismissed</span>
                <Pause className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-muted-foreground tabular-nums">{today.dismissed}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Click Rate</span>
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary tabular-nums">
                {today.shown > 0 ? Math.round((today.clicked / today.shown) * 100) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Conversion by source */}
        {performance?.by_source && performance.by_source.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden mb-6">
            <div className="px-4 py-3 border-b bg-muted/30">
              <span className="text-xs font-medium">Conversion Rate by Source</span>
            </div>
            <div className="divide-y">
              {performance.by_source.map((s) => (
                <div key={s.trigger_source} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize",
                      s.trigger_source === "campaign" ? "bg-primary/10 text-primary border-primary/20" :
                      s.trigger_source === "rule" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      "bg-muted text-muted-foreground border-border"
                    )}>{s.trigger_source}</span>
                    <span className="text-xs text-muted-foreground">{s.shown} shown · {s.clicked} clicked</span>
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">{s.conversion_rate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best rule */}
        {performance?.best_rule?.rule_name && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs font-medium">Best Performing Rule</span>
                <span className="block text-sm font-bold text-primary">{performance.best_rule.rule_name}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">{performance.best_rule.triggers} triggers · {performance.best_rule.clicks} clicks</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ UPGRADE TIMING RULES ═══ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4" /> Upgrade Timing Rules
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No upgrade timing rules configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className={cn(
                "rounded-xl border bg-card p-4 space-y-3 transition-colors",
                rule.is_active ? "border-border" : "border-border/50 opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id, rule.is_active)} />
                    <div>
                      <span className="text-sm font-semibold">{rule.rule_name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                          rule.prompt_strength === "strong" ? "bg-primary/10 text-primary border-primary/20" :
                          rule.prompt_strength === "standard" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-muted text-muted-foreground border-border"
                        )}>{rule.prompt_strength}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{rule.prompt_type}</span>
                        <span className="text-[10px] text-muted-foreground">Priority: {rule.priority_weight}</span>
                        <span className="text-[10px] text-muted-foreground">Cooldown: {rule.cooldown_hours}h</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => editingId === rule.id ? saveEdit() : startEdit(rule)}>
                    {editingId === rule.id ? "Save" : "Edit"}
                  </Button>
                </div>

                {/* Thresholds summary */}
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {rule.min_readiness_score > 0 && <span className="px-2 py-0.5 rounded bg-muted">Score ≥ {rule.min_readiness_score}</span>}
                  {rule.min_capture_count > 0 && <span className="px-2 py-0.5 rounded bg-muted">Captures ≥ {rule.min_capture_count}</span>}
                  {rule.min_project_count > 0 && <span className="px-2 py-0.5 rounded bg-muted">Projects ≥ {rule.min_project_count}</span>}
                  {rule.min_memory_count > 0 && <span className="px-2 py-0.5 rounded bg-muted">Memory ≥ {rule.min_memory_count}</span>}
                  {rule.min_referral_count > 0 && <span className="px-2 py-0.5 rounded bg-muted">Referrals ≥ {rule.min_referral_count}</span>}
                  {rule.require_recent_activity && <span className="px-2 py-0.5 rounded bg-muted">Active within {rule.recent_activity_window_hours}h</span>}
                </div>

                {/* Edit form */}
                {editingId === rule.id && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Min Score</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.min_readiness_score ?? 0}
                        onChange={(e) => setEditValues(v => ({ ...v, min_readiness_score: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Min Captures</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.min_capture_count ?? 0}
                        onChange={(e) => setEditValues(v => ({ ...v, min_capture_count: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Min Projects</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.min_project_count ?? 0}
                        onChange={(e) => setEditValues(v => ({ ...v, min_project_count: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Min Memory</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.min_memory_count ?? 0}
                        onChange={(e) => setEditValues(v => ({ ...v, min_memory_count: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Min Referrals</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.min_referral_count ?? 0}
                        onChange={(e) => setEditValues(v => ({ ...v, min_referral_count: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Cooldown (hrs)</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.cooldown_hours ?? 24}
                        onChange={(e) => setEditValues(v => ({ ...v, cooldown_hours: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Priority</label>
                      <Input type="number" className="h-7 text-xs" value={editValues.priority_weight ?? 0}
                        onChange={(e) => setEditValues(v => ({ ...v, priority_weight: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Strength</label>
                      <Select value={editValues.prompt_strength} onValueChange={(v) => setEditValues(ev => ({ ...ev, prompt_strength: v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="soft">Soft</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Type</label>
                      <Select value={editValues.prompt_type} onValueChange={(v) => setEditValues(ev => ({ ...ev, prompt_type: v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="badge">Badge</SelectItem>
                          <SelectItem value="banner">Banner</SelectItem>
                          <SelectItem value="modal">Modal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
