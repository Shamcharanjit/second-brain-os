/**
 * OnboardingChecklist — shows for new users until all 3 steps are done.
 *
 * Steps:
 *  1. Account activated (always ✅ since they're viewing this)
 *  2. First capture made
 *  3. First daily review done
 *
 * Hidden automatically once all steps complete OR account is > 14 days old.
 */

import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Sparkles, RotateCcw, Zap } from "lucide-react";
import { useBrain } from "@/context/BrainContext";
import { useReviewMeta } from "@/context/ReviewMetaContext";
import { useAuth } from "@/context/AuthContext";

function Step({
  done,
  label,
  description,
  cta,
  onCta,
}: {
  done: boolean;
  label: string;
  description: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className={`flex items-start gap-3 py-3 ${done ? "opacity-60" : ""}`}>
      <div className="mt-0.5 shrink-0">
        {done ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-primary h-[18px] w-[18px]" />
        ) : (
          <Circle className="h-[18px] w-[18px] text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {label}
        </p>
        {!done && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {!done && cta && onCta && (
        <button
          onClick={onCta}
          className="shrink-0 text-xs font-medium text-primary hover:underline transition-colors"
        >
          {cta} →
        </button>
      )}
    </div>
  );
}

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const { captures } = useBrain();
  const { last_daily_review_at } = useReviewMeta();
  const { user } = useAuth();

  const hasCaptured = captures.length > 0;
  const hasReviewed = !!last_daily_review_at;
  const allDone = hasCaptured && hasReviewed;

  // Hide if all steps done
  if (allDone) return null;

  // Hide for accounts older than 14 days (don't nag established users)
  if (user?.created_at) {
    const ageMs = Date.now() - new Date(user.created_at).getTime();
    if (ageMs > 14 * 24 * 60 * 60 * 1000) return null;
  }

  const completedCount = [hasCaptured, hasReviewed].filter(Boolean).length;
  const totalSteps = 2;
  const progressPct = Math.round(((completedCount + 1) / (totalSteps + 1)) * 100); // +1 for step 0 (activated)

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Getting started</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {completedCount + 1}/{totalSteps + 1}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Steps */}
      <Step
        done={true}
        label="Account activated"
        description=""
      />
      <div className="border-t border-border/40" />
      <Step
        done={hasCaptured}
        label="Capture your first thought"
        description="Type anything — a task, idea, or reminder. AI will organise it instantly."
        cta="Capture now"
        onCta={() => {
          // Scroll to capture input on dashboard or open quick capture
          document.querySelector("textarea")?.focus();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <div className="border-t border-border/40" />
      <Step
        done={hasReviewed}
        label="Do your first 2-minute review"
        description="See what's in your inbox and set today's focus. Takes 2 minutes."
        cta="Start review"
        onCta={() => navigate("/review")}
      />

      {/* Motivational footer */}
      {!hasCaptured && (
        <div className="pt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <Sparkles className="inline h-3 w-3 text-primary mr-1" />
            Capture 3 thoughts and InsightHalo starts spotting patterns automatically.
          </p>
        </div>
      )}
    </div>
  );
}
