import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, UserPlus, Loader2, Shield, Smartphone, Cloud, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import InsightHaloLogo from "@/components/branding/InsightHaloLogo";

const BENEFITS = [
  { icon: Cloud, text: "Sync across all your devices" },
  { icon: Shield, text: "Secure cloud backup of your data" },
  { icon: Smartphone, text: "Pick up exactly where you left off" },
];

export default function AuthPage() {
  const { signIn, signUp, cloudAvailable } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!cloudAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <InsightHaloLogo variant="auth" />
          <h1 className="text-2xl font-bold tracking-tight">InsightHalo</h1>
          <p className="text-sm text-muted-foreground">
            Cloud sync is not configured. The app is running in local-only mode.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else if (mode === "signup") {
      toast.success("Account created! Check your email to confirm.");
    } else {
      toast.success("Welcome back — your data is syncing.");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header with animated logo */}
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
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          {BENEFITS.map((b) => (
            <div key={b.text} className="flex items-center gap-2.5">
              <b.icon className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-xs text-muted-foreground">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
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

        {/* Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Trust footer */}
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            Your existing local data will sync to your account automatically.
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            No account required to use InsightHalo — you can always return to local-only mode.
          </p>
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs text-muted-foreground gap-1.5">
            <ArrowLeft className="h-3 w-3" /> Continue without signing in
          </Button>
        </div>
      </div>
    </div>
  );
}
