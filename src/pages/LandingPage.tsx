import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight, Zap, Search, Shield, Inbox, CalendarCheck, Lightbulb, Mic, Paperclip, Sparkles, CheckCircle2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ── Spacing tokens ── */
const S_PY      = "py-16 md:py-20";          // standard section
const S_PY_SM   = "py-12 md:py-16";          // compact section
const S_HEAD_MB = "mb-8 md:mb-10";           // heading → body
const HEAD_GAP  = "space-y-2";               // eyebrow → headline → sub
const CTR       = "mx-auto max-w-6xl px-5 md:px-8"; // container

/* ── Scroll reveal ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Secondary CTA: neutral only, no amber ── */
function SecondaryCTA({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium",
        "h-11 px-7 border border-border bg-background text-foreground",
        "hover:bg-muted hover:border-border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "w-full sm:w-auto",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Data ── */
const VALUES = [
  { icon: Zap, title: "Capture instantly", desc: "Save thoughts, voice notes, screenshots, and files in seconds — before they disappear." },
  { icon: Sparkles, title: "AI adds clarity", desc: "Extracts meaning, identifies signals, and enriches messy input into organized knowledge." },
  { icon: Inbox, title: "Organize without effort", desc: "Inbox, Today, Projects, Memory, and Ideas Vault create structure without friction." },
  { icon: Search, title: "Find it later", desc: "Search across original captures, files, and AI-enriched context whenever you need it." },
  { icon: Shield, title: "Built for real life", desc: "Fast enough for everyday thinking, powerful enough for serious work. Your data stays yours." },
];

const STEPS = [
  { num: "01", title: "Capture", desc: "Text, voice, screenshots, files — dump it fast, without formatting or friction.", icon: Mic },
  { num: "02", title: "AI understands", desc: "Extraction, enrichment, context analysis, and intelligent triage — automatically.", icon: Sparkles },
  { num: "03", title: "Recall & act", desc: "Search, organize, review, and convert ideas into projects and momentum.", icon: ArrowRight },
];

const SURFACES = [
  { title: "Smart Inbox", desc: "Every capture lands here first. AI categorizes, prioritizes, and suggests next actions.", icon: Inbox },
  { title: "Today Focus", desc: "A clear, prioritized view of what matters right now. Pin items and build daily momentum.", icon: CalendarCheck },
  { title: "Ideas Vault", desc: "Your opportunity bank. Explore, park, or promote ideas into real projects.", icon: Lightbulb },
  { title: "Memory", desc: "Decisions, insights, and references that compound over time. Your searchable knowledge base.", icon: Brain },
];

const TRUST_SIGNALS = [
  "Built for fast capture",
  "AI-assisted organization",
  "Searchable memory",
  "Privacy-conscious design",
  "Works offline-first",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ═══ HEADER ═══ */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent",
      )}>
        <div className={cn(CTR, "flex items-center justify-between h-14")}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2 group">
            <Brain className="h-5 w-5 text-primary transition-transform group-hover:scale-105" />
            <span className="text-base font-bold tracking-tight">InsightHalo</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo("how")} className="hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => scrollTo("why")} className="hover:text-foreground transition-colors">Why InsightHalo</button>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-sm hover:bg-muted">Open App</Button>
            <Button size="sm" onClick={() => navigate("/app")} className="gap-1.5 text-sm">Get Started <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <button className="md:hidden p-1.5" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-5 pb-4 space-y-2">
            <button onClick={() => scrollTo("features")} className="block text-sm text-muted-foreground hover:text-foreground py-1.5 w-full text-left">Features</button>
            <button onClick={() => scrollTo("how")} className="block text-sm text-muted-foreground hover:text-foreground py-1.5 w-full text-left">How It Works</button>
            <button onClick={() => scrollTo("why")} className="block text-sm text-muted-foreground hover:text-foreground py-1.5 w-full text-left">Why InsightHalo</button>
            <div className="flex gap-2 pt-2">
              <SecondaryCTA onClick={() => navigate("/app")} className="flex-1 text-sm h-9 px-3">Open App</SecondaryCTA>
              <Button size="sm" onClick={() => navigate("/app")} className="flex-1 text-sm">Get Started</Button>
            </div>
          </div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-20 pb-4 md:pt-24 md:pb-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className={cn("relative", CTR)}>
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                <Brain className="h-3.5 w-3.5" />
                Your AI second brain
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Capture what matters.
                <br />
                <span className="text-primary">Let AI make it useful.</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Text, voice, screenshots, files, fleeting ideas — capture everything fast.
                AI enriches, organizes, and makes it searchable so you never lose a valuable thought again.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" onClick={() => navigate("/app")} className="gap-2 text-base px-7 h-11 shadow-lg shadow-primary/20 w-full sm:w-auto">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
                <SecondaryCTA onClick={() => scrollTo("how")}>See How It Works</SecondaryCTA>
              </div>
            </Reveal>

            {/* Hero visual — product mockup */}
            <Reveal delay={400}>
              <div className="relative mt-8 md:mt-10">
                <div className="relative mx-auto max-w-2xl">
                  <div className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
                    <div className="border-b border-border/50 px-4 py-2 flex items-center gap-2 bg-muted/30">
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-border" />
                        <div className="h-2.5 w-2.5 rounded-full bg-border" />
                        <div className="h-2.5 w-2.5 rounded-full bg-border" />
                      </div>
                      <div className="flex-1 text-center">
                        <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-0.5">
                          <Brain className="h-2.5 w-2.5 text-primary" /> insighthalo.app
                        </div>
                      </div>
                    </div>
                    <div className="p-4 md:p-5 space-y-3">
                      <div className="rounded-xl border border-primary/20 bg-background p-3 space-y-2">
                        <p className="text-sm text-muted-foreground/70 italic text-left">Idea: build a weekly digest email for all captured thoughts…</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5">
                            <div className="h-6 rounded-md bg-muted px-2 flex items-center gap-1 text-[10px] text-muted-foreground"><Mic className="h-3 w-3" /> Voice</div>
                            <div className="h-6 rounded-md bg-muted px-2 flex items-center gap-1 text-[10px] text-muted-foreground"><Paperclip className="h-3 w-3" /> Attach</div>
                          </div>
                          <div className="h-6 rounded-md bg-primary px-2.5 flex items-center gap-1 text-[10px] text-primary-foreground font-medium"><Sparkles className="h-3 w-3" /> AI Organize</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border bg-background p-2.5 space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-primary" /></div>
                            <span className="text-[10px] font-semibold">Sorted to Ideas</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Weekly digest email concept</p>
                          <div className="flex gap-1">
                            <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded">product</span>
                            <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded">growth</span>
                          </div>
                        </div>
                        <div className="rounded-lg border bg-background p-2.5 space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center"><Lightbulb className="h-3 w-3 text-primary" /></div>
                            <span className="text-[10px] font-semibold">High Potential</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Priority: 78/100</p>
                          <div className="text-[8px] text-primary font-medium">→ Next: Draft requirements</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Floating accent cards */}
                  <div className="hidden md:block absolute -right-8 top-8 rounded-xl border bg-card shadow-lg dark:shadow-black/30 p-2.5 space-y-1 w-40 rotate-2">
                    <div className="flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-semibold">Found in Memory</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">"weekly digest" — 3 matches</p>
                  </div>
                  <div className="hidden md:block absolute -left-8 bottom-4 rounded-xl border bg-card shadow-lg dark:shadow-black/30 p-2.5 space-y-1 w-36 -rotate-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-semibold">Auto-Approved</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">High confidence · AI enriched</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="border-y border-border/40 bg-muted/20 dark:bg-muted/10">
        <div className={cn(CTR, "py-4")}>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {TRUST_SIGNALS.map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary/50" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CORE VALUES — 5 cards: 3 + 2 centered ═══ */}
      <section id="features" className={S_PY}>
        <div className={CTR}>
          <Reveal>
            <div className={cn("text-center", S_HEAD_MB, HEAD_GAP)}>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need to think clearly</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">From fast capture to intelligent recall — one calm workspace for your most valuable thinking.</p>
            </div>
          </Reveal>
          {/* Row 1: 3 cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {VALUES.slice(0, 3).map((v, i) => (
              <Reveal key={v.title} delay={i * 80}>
                <div className="group h-full rounded-2xl border bg-card p-5 space-y-2.5 transition-all hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center transition-colors group-hover:bg-primary/15 dark:group-hover:bg-primary/20">
                    <v.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          {/* Row 2: 2 cards centered */}
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto mt-4">
            {VALUES.slice(3).map((v, i) => (
              <Reveal key={v.title} delay={(i + 3) * 80}>
                <div className="group h-full rounded-2xl border bg-card p-5 space-y-2.5 transition-all hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center transition-colors group-hover:bg-primary/15 dark:group-hover:bg-primary/20">
                    <v.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className={cn(S_PY, "bg-muted/20 dark:bg-muted/10 border-y border-border/30")}>
        <div className={CTR}>
          <Reveal>
            <div className={cn("text-center", S_HEAD_MB, HEAD_GAP)}>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">Three steps from scattered thought to organized action.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 120}>
                <div className="text-center space-y-2.5">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="block text-xs font-bold text-primary/50 uppercase tracking-widest">{s.num}</span>
                  <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT DEPTH ═══ */}
      <section className={S_PY}>
        <div className={CTR}>
          <Reveal>
            <div className={cn("text-center", S_HEAD_MB, HEAD_GAP)}>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Surfaces that serve your thinking</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto">Each workspace is purpose-built for a different mode of thought.</p>
            </div>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {SURFACES.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="group h-full rounded-2xl border bg-card p-5 space-y-2 transition-all hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0">
                      <s.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight">{s.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY INSIGHTHALO ═══ */}
      <section id="why" className={cn(S_PY, "bg-muted/20 dark:bg-muted/10 border-y border-border/30")}>
        <div className={CTR}>
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Most tools help you store information.<br /><span className="text-primary">InsightHalo helps you think.</span></h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed text-sm md:text-base">
                  <p>Traditional note apps force you into their structure. Screenshot folders become graveyards. Bookmarks disappear into the void. Voice memos never get reviewed.</p>
                  <p>InsightHalo is different. It captures how you actually think — fast, messy, multi-format — then uses AI to extract meaning, add context, and organize everything into surfaces designed for action.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { label: "Speed of capture", desc: "Seconds, not minutes" },
                    { label: "Less friction", desc: "No formatting required" },
                    { label: "Better retrieval", desc: "AI-enriched search" },
                    { label: "Human-first AI", desc: "Assists, never takes over" },
                  ].map((d) => (
                    <div key={d.label} className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ TRUST / PRIVACY ═══ */}
      <section className={S_PY_SM}>
        <div className={CTR}>
          <Reveal>
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="mx-auto h-11 w-11 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Your thoughts, your control</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Your original capture text is always preserved exactly as you entered it. AI enrichment is additive — it adds context without changing your words. Designed for clarity, privacy, and trust.
              </p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {["Original text preserved", "AI enrichment is additive", "Works offline-first", "No data sold or shared"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/50" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className={cn(S_PY, "border-t border-border/30")}>
        <div className={CTR}>
          <Reveal>
            <div className="relative max-w-2xl mx-auto text-center space-y-5">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="relative space-y-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Start capturing before good ideas disappear.</h2>
                <p className="text-base md:text-lg text-muted-foreground">Build your second brain with less friction. No credit card required.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <Button size="lg" onClick={() => navigate("/app")} className="gap-2 text-base px-7 h-11 shadow-lg shadow-primary/20 w-full sm:w-auto">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                  <SecondaryCTA onClick={() => navigate("/app")}>Open App</SecondaryCTA>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/50 bg-muted/20 dark:bg-muted/10">
        <div className={cn(CTR, "py-8")}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">InsightHalo</span>
              <span className="text-xs text-muted-foreground">— Built for clarity</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/app")} className="hover:text-foreground transition-colors">Open App</button>
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            </div>
            <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} InsightHalo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
