import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, UserPlus, Loader2, Shield, Smartphone, Cloud, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";
import { supabase } from "@/lib/supabase/client";

const BENEFITS = [
  { icon: Cloud, text: "Sync across all your devices" },
  { icon: Shield, text: "Secure cloud backup of your data" },
  { icon: Smartphone, text: "Pick up exactly where you left off" },
];

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get("email") || "";
  const isInviteFlow = searchParams.get("invite") === "true";
  const [mode, setMode] = useState<"login" | "signup">(isInviteFlow ? "signup" : "login");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [inviteLocked, setInviteLocked] = useState(isInviteFlow && !!inviteEmail);

  if (!cloudAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <InsightHaloLogo variant="auth" />
          <h1 className="text-2xl font-bold tracking-tight">InsightHalo</h1>
          <p className="text-sm text-muted-foreground">
            Cloud sync is not configured. The app is running in local-only mode.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/app")} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const checkInvite = async (emailToCheck: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("check-invite", {
        body: { email: emailToCheck.trim().toLowerCase() },
      });
      if (error) return false;
      return data?.invited === true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setBlocked(false);

    if (mode === "signup" && !inviteLocked) {
      const invited = await checkInvite(email);
      if (!invited) {
        setBlocked(true);
        setLoading(false);
        return;
      }
    }

    const { error } = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase().includes("invalid") || error.message?.toLowerCase().includes("credentials")
        ? "Invalid email or password"
        : error.message;
      toast.error(msg);
    } else if (mode === "signup") {
      toast.success("Account created! Check your email to confirm.");
    } else {
      toast.success("Welcome back — your data is syncing.");
      navigate("/app");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <InsightHaloLogo variant="auth" />
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to access your second brain from anywhere"
              : "Unlock cloud sync to protect and access your data everywhere"
            }
          </p>
          {/* Early access badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <Lock className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-medium text-primary">Early Access · Invite Only</span>
          </div>
        </div>

        {/* Blocked state */}
        {blocked && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3 text-center">
            <p className="text-sm font-medium text-foreground">
              InsightHalo is currently in controlled early access.
            </p>
            <p className="text-xs text-muted-foreground">
              This email hasn't been invited yet. Join the waitlist to be considered for access.
            </p>
            <Button size="sm" onClick={() => navigate("/waitlist")} className="gap-1.5">
              Join the Waitlist
            </Button>
          </div>
        )}

        {/* Benefits */}
        {!blocked && (
          <div className="space-y-2">
            {BENEFITS.map((b) => (
              <div key={b.text} className="flex items-center gap-2.5">
                <b.icon className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-xs text-muted-foreground">{b.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const { error } = await signInWithGoogle();
            if (error) {
              toast.error("Google sign-in failed. Please try again.");
              setLoading(false);
            }
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email" placeholder="Email" value={email}
              onChange={(e) => { setEmail(e.target.value); setBlocked(false); if (inviteLocked) setInviteLocked(false); }}
              required readOnly={inviteLocked}
              className={inviteLocked ? "bg-muted cursor-not-allowed" : ""}
            />
            <Input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "login" ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        {/* Forgot password */}
        {mode === "login" && (
          <div className="text-center">
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.error("Enter your email first"); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(error.message);
                else toast.success("Password reset email sent — check your inbox.");
              }}
              className="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setBlocked(false); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Trust footer */}
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            Access is currently by invitation only during early access.
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            Join the waitlist and we'll invite you as we open access in batches.
          </p>
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs text-muted-foreground gap-1.5">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
