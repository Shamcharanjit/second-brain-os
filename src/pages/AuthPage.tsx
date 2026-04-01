import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const { signIn, signUp, cloudAvailable } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!cloudAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">InsightHalo</h1>
          <p className="text-sm text-muted-foreground">
            Cloud sync is not configured. The app is running in local-only mode.
          </p>
          <p className="text-[10px] text-muted-foreground">
            To enable cloud sync, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
          </p>
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">InsightHalo</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to sync your data" : "Create your account"}
          </p>
        </div>

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

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">
            You can also use InsightHalo without signing in — your data will be saved locally.
          </p>
        </div>
      </div>
    </div>
  );
}
