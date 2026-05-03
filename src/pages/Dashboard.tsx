import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardWelcome from "@/components/dashboard/DashboardWelcome";
import WhatsNewBanner from "@/components/dashboard/WhatsNewBanner";
import DashboardSignals from "@/components/dashboard/DashboardSignals";
import DashboardActiveWork from "@/components/dashboard/DashboardActiveWork";
import DashboardStrategy from "@/components/dashboard/DashboardStrategy";
import DashboardMomentum from "@/components/dashboard/DashboardMomentum";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import CloudUpgradeNudge from "@/components/dashboard/CloudUpgradeNudge";
import ReferralNudge from "@/components/dashboard/ReferralNudge";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import CaptureInput from "@/components/CaptureInput";
import { Sparkles, Inbox, FolderKanban, Brain, BarChart3 } from "lucide-react";
import { useFirstRun } from "@/hooks/useFirstRun";
import { useActivationFunnelTracker } from "@/hooks/useActivationFunnelTracker";
import { useFirstProductActions } from "@/hooks/useFirstProductActions";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";

const ONBOARDING_KEY = "ih_onboarding_v1";

function SectionHeader({ icon: Icon, label, to }: { icon: React.ElementType; label: string; to?: string }) {
  const navigate = useNavigate();
  
  if (to) {
    return (
      <button
        onClick={() => navigate(to)}
        className="flex items-center gap-2 pt-2 group cursor-pointer"
      >
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{label}</h2>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
    </div>
  );
}

export default function Dashboard() {
  const isFirstRun = useFirstRun();
  const navigate = useNavigate();
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();

  useActivationFunnelTracker();
  useFirstProductActions(captures.length, projects.length, memories.length);

  // Redirect brand-new users to the onboarding wizard (once, until they complete it)
  useEffect(() => {
    if (isFirstRun && !localStorage.getItem(ONBOARDING_KEY)) {
      navigate("/onboarding", { replace: true });
    }
  }, [isFirstRun, navigate]);

  return (
    <div className="space-y-8">
      <WhatsNewBanner />
      <DashboardHero />
      <OnboardingChecklist />

      <SectionHeader icon={Inbox} label="Signals" to="/inbox" />
      <DashboardSignals />

      <CloudUpgradeNudge />
      <ReferralNudge />

      <section className="space-y-3">
        <SectionHeader icon={Sparkles} label="Quick Capture" to="/capture-gateway" />
        <CaptureInput />
      </section>

      <SectionHeader icon={Inbox} label="Alerts" to="/inbox" />
      <DashboardAlerts />

      <SectionHeader icon={FolderKanban} label="Active Work" to="/projects" />
      <DashboardActiveWork />

      <SectionHeader icon={Brain} label="Strategy" to="/ideas" />
      <DashboardStrategy />

      <SectionHeader icon={BarChart3} label="Momentum" to="/today" />
      <DashboardMomentum />
    </div>
  );
}
