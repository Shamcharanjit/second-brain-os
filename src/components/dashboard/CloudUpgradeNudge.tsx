import { useNavigate } from "react-router-dom";
import { Cloud, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEngagementLevel } from "@/hooks/useFirstRun";

/**
 * Subtle nudge shown when an unauthenticated user has created meaningful data.
 * Disappears for signed-in users or when cloud is unavailable.
 */
export default function CloudUpgradeNudge() {
  const { user, cloudAvailable } = useAuth();
  const { total } = useEngagementLevel();
  const navigate = useNavigate();

  // Don't show if: already signed in, cloud not available, or user hasn't created enough data
  if (user || !cloudAvailable || total < 3) return null;

  return (
    <button
      onClick={() => navigate("/auth")}
      className="group flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/8"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <Cloud className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">Protect your second brain</p>
        <p className="text-xs text-muted-foreground">
          You've captured {total} item{total !== 1 ? "s" : ""}. Sign in to sync across devices and keep them safe.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary/50 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
