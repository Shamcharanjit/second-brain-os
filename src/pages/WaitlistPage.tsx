import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight, CheckCircle2, Sparkles, Loader2, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_CASES = [
  "Work",
  "Study",
  "Business ideas",
  "Personal organization",
  "Content creation",
  "Other",
];

const TRUST = [
  "No credit card required",
  "Early access priority",
  "Premium features included",
  "Your data stays private",
];

export default function WaitlistPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);

  // Capture ref param from URL
  const refParam = new URLSearchParams(window.location.search).get("ref");

  /* Force dark mode */
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.add("dark");
    return () => { if (!hadDark) html.classList.remove("dark"); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from("waitlist_signups").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        use_case: useCase || null,
        notes: notes.trim() || null,
        ...(refParam ? { referred_by: refParam } : {}),
      }).select("referral_code, referral_count").single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint on email
          toast.info("You're already on the list! We'll be in touch soon.");
          setSubmitted(true);
        } else {
          toast.error("Something went wrong. Please try again.");
          console.error("Waitlist error:", error);
        }
      } else {
        setReferralCode(data?.referral_code ?? null);
        setReferralCount(data?.referral_count ?? 0);
        setSubmitted(true);
        // Fire-and-forget: send confirmation email (don't block UI)
        supabase.functions
          .invoke("send-waitlist-confirmation-email", {
            body: { email: email.trim().toLowerCase(), name: name.trim() },
          })
          .then(({ error: fnErr }) => {
            if (fnErr) console.error("Confirmation email error:", fnErr);
          });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Minimal nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 group">
            <Brain className="h-5 w-5 text-primary transition-transform group-hover:scale-105" />
            <span className="text-base font-bold tracking-tight">InsightHalo</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm hover:bg-muted">
            Sign In
          </Button>
        </div>
      </header>

      <div className="pt-14 flex items-center justify-center min-h-screen px-5">
        <div className="w-full max-w-md py-16 md:py-20">
          {!submitted ? (
            <div className="space-y-8">
              {/* Hero */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Early Access
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Join the waitlist
                </h1>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  InsightHalo is rolling out in controlled early access. Request your spot and be among the first to experience your AI second brain.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11"
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />

                  {/* Use-case picker */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      What will you use InsightHalo for?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {USE_CASES.map((uc) => (
                        <button
                          key={uc}
                          type="button"
                          onClick={() => setUseCase(useCase === uc ? "" : uc)}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-full border transition-colors",
                            useCase === uc
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {uc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    placeholder="Anything else you'd like us to know? (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 h-11 text-base shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Request Early Access <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Trust */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {TRUST.map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary/50" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Success state ── */
            <div className="text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">You're on the list</h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  InsightHalo is currently rolling out in early access.
                  We'll invite people in batches as we open access — you'll hear from us soon.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2 max-w-xs mx-auto">
                <p className="text-xs font-medium text-foreground">What happens next?</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    We review requests and invite in waves
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    You'll get an invite email when it's your turn
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Early users get full premium access
                  </li>
                </ul>
              </div>

              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-sm text-muted-foreground gap-1.5">
                ← Back to InsightHalo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-muted/20 dark:bg-muted/10">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">InsightHalo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            </div>
            <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} InsightHalo</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
