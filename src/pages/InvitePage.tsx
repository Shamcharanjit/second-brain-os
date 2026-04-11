import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Loader2, ShieldX, ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";
import { toast } from "sonner";

type InviteStatus = "loading" | "invalid" | "ready" | "activating" | "done";

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1 — validate the token
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-invite-token", {
          body: { token },
        });

        if (error) {
          console.error("[InvitePage] check-invite-token error:", error);
          setStatus("invalid");
          return;
        }

        // supabase.functions.invoke may return parsed JSON or a string
        let parsed = data;
        if (typeof data === "string") {
          try { parsed = JSON.parse(data); } catch { /* keep as-is */ }
        }

        console.log("[InvitePage] check-invite-token response:", parsed);

        if (!parsed?.valid || !parsed?.email) {
          setStatus("invalid");
          return;
        }
        setEmail(parsed.email);
        setStatus("ready");
      } catch (err) {
        console.error("[InvitePage] check-invite-token exception:", err);
        setStatus("invalid");
      }
    })();
  }, [token]);

  // Step 2 — activate account
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }

    setStatus("activating");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("activate-invite", {
        body: { token, password },
      });

      if (error || !data?.success) {
        const msg = data?.error || error?.message || "Activation failed";

        // If account already exists, redirect to sign-in
        if (msg.includes("already exists")) {
          toast.info("Account already exists — please sign in.");
          navigate(`/auth?email=${encodeURIComponent(email)}`, { replace: true });
          return;
        }

        setErrorMsg(msg);
        setStatus("ready");
        return;
      }

      // If we got a session, set it directly
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Welcome to InsightHalo!");
        navigate("/app", { replace: true });
      } else {
        // Fallback — account created but no session, redirect to login
        toast.success("Account created! Please sign in.");
        navigate(`/auth?email=${encodeURIComponent(email)}`, { replace: true });
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("ready");
    }
  };

  // ── Render ──

  if (status === "loading" || status === "activating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <InsightHaloLogo variant="auth" />
          <h1 className="text-xl font-bold tracking-tight">
            {status === "loading" ? "Verifying your invite…" : "Setting up your account…"}
          </h1>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <InsightHaloLogo variant="auth" />
          <ShieldX className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="text-xl font-bold tracking-tight">Invalid Invite Link</h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid or has expired. Join the waitlist to request access.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/waitlist")}>Join the Waitlist</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs text-muted-foreground">
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // status === "ready" — show password setup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <InsightHaloLogo variant="auth" />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <ShieldCheck className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-medium text-primary">Invite Verified</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set your password</h1>
          <p className="text-sm text-muted-foreground">
            Almost there! Create a password to activate your InsightHalo account.
          </p>
        </div>

        {/* Email display */}
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <p className="text-[11px] text-muted-foreground mb-0.5">Your account email</p>
          <p className="text-sm font-medium text-foreground">{email}</p>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
            <p className="text-sm text-destructive">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleActivate} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" className="w-full gap-2">
            <ArrowRight className="h-4 w-4" /> Activate Account
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate(`/auth?email=${encodeURIComponent(email)}`)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
