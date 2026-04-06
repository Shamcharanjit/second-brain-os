import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight, Zap, Search, Shield, Inbox, CalendarCheck, Lightbulb, Mic, Paperclip, Sparkles, CheckCircle2, Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

/* ── Scroll reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
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
  { title: "Smart Inbox", desc: "Every capture lands here first. AI categorizes, prioritizes, and suggests next actions so nothing falls through the cracks.", icon: Inbox, accent: "var(--brain-amber)" },
  { title: "Today Focus", desc: "A clear, prioritized view of what matters right now. Pin your top items and build daily momentum.", icon: CalendarCheck, accent: "var(--brain-teal)" },
  { title: "Ideas Vault", desc: "Your opportunity bank. Explore, park, or promote ideas into real projects when the timing is right.", icon: Lightbulb, accent: "var(--brain-purple)" },
  { title: "Memory", desc: "Decisions, insights, and references that compound over time. Your searchable knowledge base.", icon: Brain, accent: "var(--brain-blue)" },
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
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"}`}>
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-4 md:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 group">
            <Brain className="h-6 w-6 text-primary transition-transform group-hover:scale-105" />
            <span className="text-lg font-bold tracking-tight">InsightHalo</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo("how")} className="hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => scrollTo("why")} className="hover:text-foreground transition-colors">Why InsightHalo</button>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-sm">Open App</Button>
            <Button size="sm" onClick={() => navigate("/app")} className="gap-1.5 text-sm">Get Started <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-5 pb-5 space-y-3">
            <button onClick={() => scrollTo("features")} className="block text-sm text-muted-foreground hover:text-foreground py-1.5">Features</button>
            <button onClick={() => scrollTo("how")} className="block text-sm text-muted-foreground hover:text-foreground py-1.5">How It Works</button>
            <button onClick={() => scrollTo("why")} className="block text-sm text-muted-foreground hover:text-foreground py-1.5">Why InsightHalo</button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/app")} className="flex-1 text-sm">Open App</Button>
              <Button size="sm" onClick={() => navigate("/app")} className="flex-1 text-sm">Get Started</Button>
            </div>
          </div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <RevealSection>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-2">
                <Brain className="h-3.5 w-3.5" />
                Your AI second brain
              </div>
            </RevealSection>
            <RevealSection delay={100}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
                Capture what matters.
                <br />
                <span className="text-primary">Let AI make it useful.</span>
              </h1>
            </RevealSection>
            <RevealSection delay={200}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Text, voice, screenshots, files, fleeting ideas — capture everything fast.
                AI enriches, organizes, and makes it searchable so you never lose a valuable thought again.
              </p>
            </RevealSection>
            <RevealSection delay={300}>
              <div className="flex items-center justify-center gap-4">
                <Button size="lg" onClick={() => navigate("/app")} className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo("how")} className="text-base px-8 h-12">
                  See How It Works
                </Button>
              </div>
            </RevealSection>

            {/* Hero visual — product mockup composition */}
            <RevealSection delay={400}>
              <div className="relative mt-12 md:mt-16">
                <div className="relative mx-auto max-w-2xl">
                  {/* Main app preview card */}
                  <div className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/5 overflow-hidden">
                    <div className="border-b border-border/50 px-4 py-2.5 flex items-center gap-2 bg-card/80">
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
                    <div className="p-5 md:p-8 space-y-4">
                      {/* Simulated capture input */}
                      <div className="rounded-xl border border-primary/20 bg-background p-4 space-y-3">
                        <p className="text-sm text-muted-foreground/70 italic">Idea: build a weekly digest email for all captured thoughts…</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5">
                            <div className="h-7 rounded-md bg-muted px-2.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Mic className="h-3 w-3" /> Voice</div>
                            <div className="h-7 rounded-md bg-muted px-2.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Paperclip className="h-3 w-3" /> Attach</div>
                          </div>
                          <div className="h-7 rounded-md bg-primary px-3 flex items-center gap-1 text-[10px] text-primary-foreground font-medium"><Sparkles className="h-3 w-3" /> AI Organize</div>
                        </div>
                      </div>
                      {/* Simulated AI result cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-background p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded bg-[hsl(var(--brain-teal))/0.12] flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-[hsl(var(--brain-teal))]" /></div>
                            <span className="text-[10px] font-semibold">Sorted to Ideas</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Weekly digest email concept</p>
                          <div className="flex gap-1">
                            <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded">product</span>
                            <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded">growth</span>
                          </div>
                        </div>
                        <div className="rounded-lg border bg-background p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded bg-[hsl(var(--brain-amber))/0.12] flex items-center justify-center"><Lightbulb className="h-3 w-3 text-[hsl(var(--brain-amber))]" /></div>
                            <span className="text-[10px] font-semibold">High Potential</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Priority: 78/100</p>
                          <div className="text-[8px] text-primary font-medium">→ Next: Draft requirements</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Floating accent cards */}
                  <div className="hidden md:block absolute -right-6 top-12 rounded-xl border bg-card shadow-lg p-3 space-y-1.5 w-44 rotate-2">
                    <div className="flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-semibold">Found in Memory</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">"weekly digest" — 3 matches across captures and attachments</p>
                  </div>
                  <div className="hidden md:block absolute -left-6 bottom-8 rounded-xl border bg-card shadow-lg p-3 space-y-1 w-40 -rotate-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-[hsl(var(--brain-teal))]" />
                      <span className="text-[10px] font-semibold">Auto-Approved</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">High confidence · AI enriched</p>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TRUST_SIGNALS.map((s) => (
              <div key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary/60" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CORE VALUES ═══ */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <RevealSection>
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need to think clearly</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">From fast capture to intelligent recall — one calm workspace for your most valuable thinking.</p>
            </div>
          </RevealSection>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v, i) => (
              <RevealSection key={v.title} delay={i * 80}>
                <div className="group rounded-2xl border bg-card p-6 md:p-8 space-y-4 transition-all hover:shadow-md hover:border-primary/20">
                  <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center transition-colors group-hover:bg-primary/12">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-24 md:py-32 bg-muted/20 border-y border-border/30">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <RevealSection>
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">Three steps from scattered thought to organized action.</p>
            </div>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((s, i) => (
              <RevealSection key={s.num} delay={i * 120}>
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center">
                    <s.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">{s.num}</span>
                    <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT DEPTH ═══ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <RevealSection>
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Surfaces that serve your thinking</h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">Each workspace is purpose-built for a different mode of thought.</p>
            </div>
          </RevealSection>
          <div className="grid gap-6 md:grid-cols-2">
            {SURFACES.map((s, i) => (
              <RevealSection key={s.title} delay={i * 80}>
                <div className="group rounded-2xl border bg-card p-6 md:p-8 space-y-4 transition-all hover:shadow-md hover:border-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `hsl(${s.accent} / 0.1)` }}>
                      <s.icon className="h-6 w-6" style={{ color: `hsl(${s.accent})` }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY INSIGHTHALO ═══ */}
      <section id="why" className="py-24 md:py-32 bg-muted/20 border-y border-border/30">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="max-w-3xl mx-auto">
            <RevealSection>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Most tools help you store information.<br /><span className="text-primary">InsightHalo helps you think.</span></h2>
                <div className="space-y-5 text-muted-foreground leading-relaxed">
                  <p>Traditional note apps force you into their structure. Screenshot folders become graveyards. Bookmarks disappear into the void. Voice memos never get reviewed.</p>
                  <p>InsightHalo is different. It captures how you actually think — fast, messy, multi-format — then uses AI to extract meaning, add context, and organize everything into surfaces designed for action.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {[
                    { label: "Speed of capture", desc: "Seconds, not minutes" },
                    { label: "Less friction", desc: "No formatting required" },
                    { label: "Better retrieval", desc: "AI-enriched search" },
                    { label: "Human-first AI", desc: "Assists, never takes over" },
                  ].map((d) => (
                    <div key={d.label} className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══ TRUST / PRIVACY ═══ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <RevealSection>
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Your thoughts, your control</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your original capture text is always preserved exactly as you entered it. AI enrichment is additive — it adds context without changing your words. Designed for clarity, privacy, and trust.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                {["Original text preserved", "AI enrichment is additive", "Works offline-first", "No data sold or shared"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/60" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 md:py-32 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <RevealSection>
            <div className="relative max-w-2xl mx-auto text-center space-y-8">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="relative space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Start capturing before good ideas disappear.</h2>
                <p className="text-lg text-muted-foreground">Build your second brain with less friction. No credit card required.</p>
                <div className="flex items-center justify-center gap-4">
                  <Button size="lg" onClick={() => navigate("/app")} className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/app")} className="text-base px-8 h-12">
                    Open App
                  </Button>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Brain className="h-5 w-5 text-primary" />
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