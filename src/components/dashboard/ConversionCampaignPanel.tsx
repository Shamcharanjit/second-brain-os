import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone, Plus, Loader2, Calendar, Users, Target, Sparkles,
  Play, Pause, Trash2, DollarSign, Clock, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";

/* ── types ── */

type Campaign = {
  id: string;
  campaign_name: string;
  target_segment: string[];
  min_score_threshold: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  prompt_strength: string;
  notes: string | null;
  created_at: string;
};

type ConversionSummary = {
  total_eligible: number;
  upgrade_ready: number;
  avg_score: number;
  india_count: number;
  international_count: number;
};

const SEGMENTS = [
  { key: "power_users", label: "Power Users" },
  { key: "referral_leaders", label: "Referral Leaders" },
  { key: "recent_activations", label: "Recent Activations" },
  { key: "high_engagement", label: "High Engagement" },
  { key: "upgrade_ready", label: "Upgrade Ready (≥60)" },
];

const PROMPT_STRENGTHS = ["soft", "standard", "strong"] as const;

function PromptBadge({ strength }: { strength: string }) {
  const cls =
    strength === "strong" ? "bg-destructive/10 text-destructive border-destructive/20" :
    strength === "standard" ? "bg-primary/10 text-primary border-primary/20" :
    "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", cls)}>
      {strength}
    </span>
  );
}

export default function ConversionCampaignPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [conversionSummary, setConversionSummary] = useState<ConversionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>(["upgrade_ready"]);
  const [minScore, setMinScore] = useState(60);
  const [promptStrength, setPromptStrength] = useState<string>("standard");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, convRes] = await Promise.all([
      supabase.from("conversion_campaigns" as any).select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_conversion_candidates" as any),
    ]);
    if (!cRes.error) setCampaigns(cRes.data as any || []);
    if (!convRes.error && convRes.data) {
      const s = (convRes.data as any).summary;
      if (s) setConversionSummary(s);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Campaign name required"); return; }
    setCreating(true);
    const { error } = await supabase.from("conversion_campaigns" as any).insert({
      campaign_name: name.trim(),
      target_segment: selectedSegments,
      min_score_threshold: minScore,
      end_date: endDate || null,
      is_active: false,
      prompt_strength: promptStrength,
      notes: notes || null,
    } as any);
    if (error) { toast.error("Failed to create campaign"); } else {
      toast.success("Campaign created");
      setShowCreate(false);
      setName(""); setNotes(""); setEndDate("");
      fetchData();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("conversion_campaigns" as any).update({ is_active: !current } as any).eq("id", id);
    if (error) toast.error("Failed to update"); else fetchData();
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("conversion_campaigns" as any).delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else { toast.success("Campaign deleted"); fetchData(); }
  };

  /* ── simulation ── */
  const activeSimulation = useMemo(() => {
    if (!conversionSummary) return null;
    const activeCampaigns = campaigns.filter(c => c.is_active);
    if (activeCampaigns.length === 0) return null;
    const maxThreshold = Math.min(...activeCampaigns.map(c => c.min_score_threshold));
    // Rough estimate: eligible = users with score >= threshold
    const estimatedEligible = conversionSummary.upgrade_ready;
    const indiaRatio = conversionSummary.total_eligible > 0
      ? conversionSummary.india_count / conversionSummary.total_eligible : 0;
    const intlRatio = 1 - indiaRatio;
    return {
      eligible: estimatedEligible,
      india: Math.round(estimatedEligible * indiaRatio),
      international: Math.round(estimatedEligible * intlRatio),
      projectedMrrUsd: Math.round(estimatedEligible * intlRatio * 9),
      projectedMrrInr: Math.round(estimatedEligible * indiaRatio * 749),
      confidence: Math.round(conversionSummary.avg_score),
      threshold: maxThreshold,
    };
  }, [campaigns, conversionSummary]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.is_active);
  const historyCampaigns = campaigns.filter(c => !c.is_active);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Conversion Campaigns
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3" /> New Campaign
        </Button>
      </div>

      {/* ── Create Form ── */}
      {showCreate && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <p className="text-xs font-semibold text-foreground">Create Conversion Campaign</p>
          <Input placeholder="Campaign name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />

          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground">Target Segments</p>
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTS.map(s => (
                <button key={s.key}
                  onClick={() => setSelectedSegments(prev =>
                    prev.includes(s.key) ? prev.filter(x => x !== s.key) : [...prev, s.key]
                  )}
                  className={cn("text-[10px] px-2.5 py-1 rounded-full border transition-colors",
                    selectedSegments.includes(s.key) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Min Score Threshold</p>
              <Input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))} className="text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">End Date (optional)</p>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">Prompt Strength</p>
            <div className="flex gap-1.5">
              {PROMPT_STRENGTHS.map(s => (
                <button key={s}
                  onClick={() => setPromptStrength(s)}
                  className={cn("text-[10px] px-3 py-1.5 rounded-full border capitalize transition-colors",
                    promptStrength === s ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" rows={2} />

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Create Campaign
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Active Campaigns ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Play className="h-3 w-3 text-primary" /> Active Campaigns
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{activeCampaigns.length}</span>
        </p>
        {activeCampaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 pl-5">No active campaigns</p>
        ) : (
          <div className="space-y-2">
            {activeCampaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onToggle={toggleActive} onDelete={deleteCampaign} />
            ))}
          </div>
        )}
      </section>

      {/* ── Active Simulation ── */}
      {activeSimulation && (
        <section className="space-y-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-primary" /> Campaign Impact Projection
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] text-muted-foreground">Eligible Users</span>
              <p className="text-lg font-bold">{activeSimulation.eligible}</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
              <span className="text-[10px] text-primary">Projected MRR</span>
              <p className="text-lg font-bold text-primary">${activeSimulation.projectedMrrUsd} <span className="text-xs text-muted-foreground">+ ₹{activeSimulation.projectedMrrInr}</span></p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] text-muted-foreground">🌍 {activeSimulation.international} / 🇮🇳 {activeSimulation.india}</span>
              <p className="text-sm font-semibold">Regional Split</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] text-muted-foreground">Confidence</span>
              <p className="text-lg font-bold">{activeSimulation.confidence}%</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Simulation only — no payments triggered.</p>
        </section>
      )}

      {/* ── Campaign History ── */}
      {historyCampaigns.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" /> Campaign History
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{historyCampaigns.length}</span>
          </p>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Campaign</th>
                  <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Segments</th>
                  <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Threshold</th>
                  <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Strength</th>
                  <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Created</th>
                  <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyCampaigns.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs font-medium">{c.campaign_name}</td>
                    <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">{c.target_segment.length} segments</td>
                    <td className="px-3 py-2 text-center text-xs tabular-nums">{c.min_score_threshold}</td>
                    <td className="px-3 py-2 text-center"><PromptBadge strength={c.prompt_strength} /></td>
                    <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">{format(new Date(c.created_at), "MMM d")}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toggleActive(c.id, false)}>
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function CampaignCard({ campaign: c, onToggle, onDelete }: { campaign: Campaign; onToggle: (id: string, active: boolean) => void; onDelete: (id: string) => void }) {
  const daysRemaining = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
  const expired = c.end_date ? isPast(new Date(c.end_date)) : false;

  return (
    <div className={cn("rounded-xl border p-4 space-y-2", c.is_active ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{c.campaign_name}</span>
          <PromptBadge strength={c.prompt_strength} />
          {expired && <span className="text-[10px] text-destructive font-medium">Expired</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onToggle(c.id, c.is_active)}>
            {c.is_active ? <><Pause className="h-3 w-3 mr-1" /> Pause</> : <><Play className="h-3 w-3 mr-1" /> Activate</>}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => onDelete(c.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {c.target_segment.map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground capitalize">
            {s.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>Score ≥ {c.min_score_threshold}</span>
        {daysRemaining !== null && <span>{daysRemaining > 0 ? `${daysRemaining}d remaining` : "Ended"}</span>}
        <span>Created {format(new Date(c.created_at), "MMM d")}</span>
      </div>
      {c.notes && <p className="text-[10px] text-muted-foreground/70">{c.notes}</p>}
    </div>
  );
}
