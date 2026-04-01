import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Sparkles, CalendarCheck, Lightbulb, BookOpen, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import CaptureInput from "@/components/CaptureInput";

const ACTIONS = [
  { icon: Sparkles, label: "Capture a thought", description: "Get something out of your head", route: null },
  { icon: CalendarCheck, label: "Set today's focus", description: "What would make today successful?", route: "/today" },
  { icon: Lightbulb, label: "Save a business idea", description: "Before you forget it", route: "/ideas" },
  { icon: BookOpen, label: "Store a key memory", description: "Something you'll need later", route: "/memory" },
];

export default function DashboardWelcome() {
  const navigate = useNavigate();
  const { user, cloudAvailable } = useAuth();
  const [showCapture, setShowCapture] = useState(false);

  return (
    <section className="space-y-6">
      {/* Hero welcome */}
      <div className="rounded-2xl border bg-card p-8 space-y-3">
        <div className="flex items-center gap-2.5">
          <Brain className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Welcome to InsightHalo</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
          Your intelligent second brain. Capture thoughts, organize priorities, track projects, and build a searchable memory — all in one calm workspace.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.route) navigate(action.route);
              else setShowCapture(true);
            }}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <action.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
            <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>

      {/* Inline capture */}
      {showCapture && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Capture anything — it'll be intelligently sorted</p>
          <CaptureInput />
        </div>
      )}

      {/* Trust messaging */}
      <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground/80">Your data stays private</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {user
              ? "Your data is securely synced to your account. Accessible anywhere, always backed up."
              : cloudAvailable
                ? "Everything is stored locally on this device. Sign in anytime to sync across devices and keep your data backed up."
                : "Everything is stored locally on this device — no account required. Your second brain is fully private."
            }
          </p>
        </div>
      </div>
    </section>
  );
}
