import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight, Zap, Search, Shield, Inbox, CalendarCheck, Lightbulb, Mic, Paperclip, Sparkles, CheckCircle2, Menu, X, Users, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/seo/SeoHead";
import { softwareApplicationSchema, webApplicationSchema } from "@/lib/seo/schema";

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
  { icon: Zap, title: "10-second capture", desc: "Text, voice, file, or URL — dump it instantly without worrying about where it goes. The AI handles that." },
  { icon: Sparkles, title: "AI that actually organises", desc: "Every capture is triaged, tagged, prioritised, and routed to the right place automatically — no setup needed." },
  { icon: Inbox, title: "A place for everything", desc: "Today, Projects, Ideas Vault, Memory, Someday — each surface built for a different mode of thinking." },
  { icon: Search, title: "Find anything later", desc: "Full-text search across every capture, file, and AI-enriched note. That thing from 3 months ago? Found in seconds." },
  { icon: Shield, title: "Your data, your control", desc: "Private by design. We never train AI on your personal data. Export everything at any time." },
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

  /* Force dark mode on the landing page */
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.add("dark");
    return () => { if (!hadDark) html.classList.remove("dark"); };
  }, []);

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
      <SeoHead slug="/" jsonLd={[softwareApplicationSchema(), webApplicationSchema()]} />
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm hover:bg-muted">Sign In</Button>
            <Button size="sm" onClick={() => navigate("/waitlist")} className="gap-1.5 text-sm">Join Waitlist <ArrowRight className="h-3.5 w-3.5" /></Button>
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
              <SecondaryCTA onClick={() => navigate("/auth")} className="flex-1 text-sm h-9 px-3">Sign In</SecondaryCTA>
              <Button size="sm" onClick={() => navigate("/waitlist")} className="flex-1 text-sm">Join Waitlist</Button>
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
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered · Free to start · 140+ early adopters
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Stop losing ideas.<br />
                <span className="text-primary">Start building momentum.</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Capture thoughts, voice notes, and files in seconds. AI automatically organizes, tags, and routes everything — so you always know what to work on next.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" onClick={() => navigate("/waitlist")} className="gap-2 text-base px-7 h-11 shadow-lg shadow-primary/20 w-full sm:w-auto">
                  Get Early Access — It's Free <ArrowRight className="h-4 w-4" />
                </Button>
                <SecondaryCTA onClick={() => scrollTo("how")}>See How It Works</SecondaryCTA>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No credit card · Invite a friend, move up the waitlist faster
              </p>
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

      {/* ═══ SOCIAL PROOF STRIP ═══ */}
      <section className="border-y border-border/40 bg-muted/20 dark:bg-muted/10">
        <div className={cn(CTR, "py-5")}>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2 text-center">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">140+</p>
                <p className="text-[11px] text-muted-foreground">early adopters</p>
              </div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border/60" />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[hsl(var(--brain-amber))] shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">4.8 / 5</p>
                <p className="text-[11px] text-muted-foreground">avg. rating</p>
              </div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border/60" />
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">10 seconds</p>
                <p className="text-[11px] text-muted-foreground">to first capture</p>
              </div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border/60" />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
              {TRUST_SIGNALS.map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary/50" />
                  {s}
                </div>
              ))}
            </div>
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
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Notion is for documents.<br />Obsidian is for notes.<br /><span className="text-primary">InsightHalo is for your mind.</span></h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed text-sm md:text-base">
                  <p>Great ideas are lost every day — in your camera roll, forgotten voice memos, browser tabs you meant to revisit, and half-formed thoughts that vanished before you could write them down.</p>
                  <p>InsightHalo captures how you actually think — fast, messy, multi-format — then uses AI to instantly extract meaning, prioritize, and route everything into surfaces built for action. You review in 2 minutes. You never lose anything again.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { label: "No system to build", desc: "AI creates structure for you" },
                    { label: "No friction to capture", desc: "10 seconds, any format" },
                    { label: "Daily review in 2 min", desc: "Not an hour-long ritual" },
                    { label: "AI that knows context", desc: "Connects dots across ideas" },
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

      {/* ═══ PRICING ═══ */}
      <section className={S_PY_SM}>
        <div className={CTR}>
          <Reveal>
            <div className={cn("text-center", "mb-8", HEAD_GAP)}>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple, honest pricing</h2>
              <p className="text-base text-muted-foreground">Start free. Upgrade when you're ready.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Reveal delay={80}>
              <div className="rounded-2xl border bg-card p-6 space-y-4 h-full">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Free</p>
                  <p className="text-4xl font-bold mt-1">$0</p>
                  <p className="text-sm text-muted-foreground">forever</p>
                </div>
                <ul className="space-y-2">
                  {["Unlimited captures", "AI tagging + categorisation", "Inbox, Today, Projects, Memory", "Voice capture", "Web Share Target (PWA)"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary/60 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate("/waitlist")}>
                  Join Waitlist
                </Button>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 space-y-4 h-full relative">
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary text-primary-foreground">Popular</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5" /> Pro
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-4xl font-bold">$9</p>
                    <p className="text-sm text-muted-foreground">/ month</p>
                  </div>
                  <p className="text-xs text-muted-foreground">₹749/month for India</p>
                </div>
                <ul className="space-y-2">
                  {["Everything in Free", "Unlimited AI triage + analysis", "AI priority scoring", "Advanced review rituals", "Priority support"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full gap-2" onClick={() => navigate("/waitlist")}>
                  Get Early Access <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className={cn(S_PY, "border-t border-border/30")}>
        <div className={CTR}>
          <Reveal>
            <div className="relative max-w-2xl mx-auto text-center space-y-5">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="relative space-y-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Your next great idea deserves to be remembered.</h2>
                <p className="text-base md:text-lg text-muted-foreground">Join 140+ early adopters building their second brain with InsightHalo. Free forever, no card needed.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <Button size="lg" onClick={() => navigate("/waitlist")} className="gap-2 text-base px-7 h-11 shadow-lg shadow-primary/20 w-full sm:w-auto">
                    Get Early Access — Free <ArrowRight className="h-4 w-4" />
                  </Button>
                  <SecondaryCTA onClick={() => navigate("/auth")}>Sign In</SecondaryCTA>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Refer friends → skip the queue → get Pro free</p>
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
              <button onClick={() => navigate("/waitlist")} className="hover:text-foreground transition-colors">Join Waitlist</button>
              <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Sign In</button>
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
