import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Mail, Globe, ArrowDown,
  BrainCircuit, CheckCircle2, Clock, Mic, Zap, ChevronRight,
  Sparkles, Shield, Radio, Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBrain } from "@/context/BrainContext";
import { mockAIProcess } from "@/lib/mock-ai";
import type { AIProcessedData } from "@/types/brain";

/* ── Channel definitions ── */
const CHANNELS = [
  {
    id: "whatsapp" as const,
    name: "WhatsApp",
    icon: MessageSquare,
    color: "hsl(var(--brain-teal))",
    bgColor: "hsl(var(--brain-teal) / 0.12)",
    status: "Coming Soon" as const,
    description: "Send yourself a message or voice note and AI will process it.",
    example: "Forward any message → AI captures, classifies, and routes it.",
    captures: "Quick thoughts, reminders, voice notes, links",
  },
  {
    id: "telegram" as const,
    name: "Telegram",
    icon: Send,
    color: "hsl(var(--brain-blue))",
    bgColor: "hsl(var(--brain-blue) / 0.12)",
    status: "Coming Soon" as const,
    description: "Forward ideas, reminders, and follow-ups to your private capture bot.",
    example: "/capture Build a Chrome extension for quick idea saving",
    captures: "Ideas, systems, planning, links, structured notes",
  },
  {
    id: "email" as const,
    name: "Email",
    icon: Mail,
    color: "hsl(var(--brain-amber))",
    bgColor: "hsl(var(--brain-amber) / 0.12)",
    status: "Coming Soon" as const,
    description: "Email tasks, notes, and important thoughts into InsightHalo.",
    example: "Subject: Task — Prepare proposal draft for clinic client",
    captures: "Client work, proposals, admin tasks, follow-ups",
  },
  {
    id: "web" as const,
    name: "Web Drop",
    icon: Globe,
    color: "hsl(var(--brain-purple))",
    bgColor: "hsl(var(--brain-purple) / 0.12)",
    status: "Active" as const,
    description: "Share content from any browser or app directly into your brain.",
    example: "Share a URL or text snippet → auto-captured and categorized.",
    captures: "Articles, links, screenshots, text clips",
  },
];

type ChannelId = (typeof CHANNELS)[number]["id"];

/* ── Channel routing rules ── */
const ROUTING_RULES: Record<ChannelId, { bias: string; routes: string[]; style: string }> = {
  whatsapp: { bias: "Speed & reminders", routes: ["Today", "AI Review", "Inbox"], style: "Short-form, casual, quick thoughts and voice notes" },
  telegram: { bias: "Ideas & systems", routes: ["Ideas Vault", "Projects", "Inbox"], style: "Structured, power-user capture, links and planning" },
  email: { bias: "Work & follow-ups", routes: ["Inbox", "Projects", "Today"], style: "Formal, longer inputs, client work and admin" },
  web: { bias: "Research & links", routes: ["Ideas Vault", "Inbox", "Projects"], style: "Articles, snippets, visual content, references" },
};

/* ── Flow steps ── */
const FLOW_STEPS = [
  { icon: MessageSquare, label: "External Message", sublabel: "WhatsApp / Telegram / Email" },
  { icon: BrainCircuit, label: "AI Interpretation", sublabel: "Classify & extract intent" },
  { icon: Zap, label: "Auto-Routing", sublabel: "Route or queue for review" },
  { icon: CheckCircle2, label: "Organized", sublabel: "Inbox / Today / Ideas / Project" },
];

export default function CaptureGatewayPage() {
  const { captures, addCapture } = useBrain();
  const navigate = useNavigate();

  const [simChannel, setSimChannel] = useState<ChannelId>("whatsapp");
  const [simText, setSimText] = useState("");
  const [simVoice, setSimVoice] = useState(false);
  const [simResult, setSimResult] = useState<{ aiData: AIProcessedData; reviewStatus: string } | null>(null);
  const [simSaved, setSimSaved] = useState(false);

  const channelIcon = (ch: ChannelId) => CHANNELS.find((c) => c.id === ch)!;

  function handleSimulate() {
    if (!simText.trim()) return;
    const result = mockAIProcess(simText);
    setSimResult(result);
    setSimSaved(false);
  }

  function handleSaveSimulated() {
    if (!simText.trim()) return;
    addCapture(simText, simVoice ? "voice" : "text");
    setSimSaved(true);
  }

  /* ── Stats from real captures ── */
  const stats = useMemo(() => {
    const total = captures.length;
    const approved = captures.filter((c) => c.review_status === "auto_approved" || c.review_status === "reviewed").length;
    const review = captures.filter((c) => c.review_status === "needs_review").length;
    return { total, approved, review };
  }, [captures]);

  const recentCaptures = useMemo(() => {
    return captures
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [captures]);

  const kpis = [
    { label: "Total Captures", value: stats.total, icon: Radio, color: "text-primary" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-[hsl(var(--brain-teal))]" },
    { label: "Needs Review", value: stats.review, icon: Shield, color: "text-[hsl(var(--brain-amber))]" },
    { label: "Channels Available", value: CHANNELS.length, icon: Zap, color: "text-[hsl(var(--brain-purple))]" },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Capture Gateway</h1>
        <p className="text-sm text-muted-foreground mt-1">Capture thoughts from anywhere — messages, voice notes, and external channels.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Microcopy */}
      <div className="rounded-xl border bg-card p-5 text-center space-y-1">
        <p className="text-sm font-medium text-foreground">"Great ideas don't wait for the right screen."</p>
        <p className="text-xs text-muted-foreground">Capture from where you already think. Turn messages into meaningful action.</p>
      </div>

      {/* Connected Channels */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capture Channels</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-all hover:border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: ch.bgColor }}>
                  <ch.icon className="h-5 w-5" style={{ color: ch.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{ch.name}</span>
                    <Badge variant={ch.status === "Active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {ch.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{ch.captures}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{ch.description}</p>
              <div className="rounded-lg bg-muted/50 p-2.5">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Example:</p>
                <p className="text-xs text-foreground/80 italic">{ch.example}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How It Works</h2>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-0">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 md:gap-0 flex-1 w-full md:w-auto">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground">{step.sublabel}</p>
                  </div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden md:block mx-2 shrink-0" />
                    <ArrowDown className="h-4 w-4 text-muted-foreground md:hidden shrink-0" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Test Capture Simulator */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Test Capture</h2>
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Channel selector */}
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => { setSimChannel(ch.id); setSimResult(null); setSimSaved(false); }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                  simChannel === ch.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <ch.icon className="h-3.5 w-3.5" />
                {ch.name}
              </button>
            ))}
          </div>

          {/* Input */}
          <Textarea
            placeholder={`Simulate a ${channelIcon(simChannel).name} message…`}
            value={simText}
            onChange={(e) => { setSimText(e.target.value); setSimResult(null); setSimSaved(false); }}
            className="min-h-[70px] text-sm"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={simVoice} onChange={(e) => setSimVoice(e.target.checked)} className="rounded border-input" />
              <Mic className="h-3 w-3" /> Voice Note
            </label>
            <Button size="sm" onClick={handleSimulate} disabled={!simText.trim()} className="gap-1.5 text-xs">
              <Zap className="h-3 w-3" /> Simulate Capture
            </Button>
          </div>

          {/* Result */}
          {simResult && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Interpretation</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{simResult.aiData.title}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <Badge variant="secondary" className="text-[10px] ml-1">{simResult.aiData.category.replace("_", " ")}</Badge></div>
                <div><span className="text-muted-foreground">Destination:</span> <span className="font-medium capitalize">{simResult.aiData.destination_suggestion}</span></div>
                <div><span className="text-muted-foreground">Confidence:</span> <Badge variant={simResult.aiData.confidence === "high" ? "default" : "secondary"} className="text-[10px] ml-1">{simResult.aiData.confidence}</Badge></div>
                <div><span className="text-muted-foreground">Urgency:</span> <span className="font-medium capitalize">{simResult.aiData.urgency}</span></div>
                <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{simResult.aiData.suggested_project || "—"}</span></div>
              </div>
              <p className="text-[11px] text-muted-foreground italic">"{simResult.aiData.why_it_matters}"</p>
              <div className="flex items-center gap-2">
                <Badge variant={simResult.reviewStatus === "auto_approved" ? "default" : "outline"} className="text-[10px]">
                  {simResult.reviewStatus === "auto_approved" ? "✓ Auto-Approved" : "⚠ Needs Review"}
                </Badge>
                {simResult.aiData.review_reason && (
                  <span className="text-[10px] text-muted-foreground">— {simResult.aiData.review_reason}</span>
                )}
              </div>
              {!simSaved ? (
                <Button size="sm" onClick={handleSaveSimulated} className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Save to Brain
                </Button>
              ) : (
                <p className="text-xs text-primary font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved and routed
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Recent Captures (real data) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[hsl(var(--brain-blue))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Captures</h2>
        </div>
        {recentCaptures.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center space-y-3">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No captures yet. Use the simulator above or capture from the dashboard.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCaptures.map((cap) => {
              const aiData = cap.ai_data as AIProcessedData | null;
              const title = aiData?.title || cap.raw_input.slice(0, 60);
              const category = aiData?.category?.replace("_", " ") || "uncategorized";
              const destination = aiData?.destination_suggestion || "inbox";
              const isVoice = cap.input_type === "voice";
              const timeAgo = getTimeAgo(cap.created_at);
              return (
                <div key={cap.id} className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:shadow-sm transition-all">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{title}</span>
                      {isVoice && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <Mic className="h-2.5 w-2.5" /> Voice
                        </Badge>
                      )}
                      <Badge variant={cap.review_status === "auto_approved" || cap.review_status === "reviewed" ? "default" : "outline"} className="text-[9px] px-1.5 py-0">
                        {cap.review_status === "auto_approved" || cap.review_status === "reviewed" ? "Processed" : "Review"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{cap.raw_input}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="capitalize">{category}</span>
                      <span>→ {destination}</span>
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Channel Routing Rules */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[hsl(var(--brain-purple))]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Smart Channel Routing</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {CHANNELS.map((ch) => {
            const rule = ROUTING_RULES[ch.id];
            return (
              <div key={ch.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ch.icon className="h-4 w-4" style={{ color: ch.color }} />
                  <span className="text-xs font-semibold">{ch.name}</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{rule.bias}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{rule.style}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Routes to:</span>
                  {rule.routes.map((r) => (
                    <Badge key={r} variant="outline" className="text-[9px] px-1.5 py-0">{r}</Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
