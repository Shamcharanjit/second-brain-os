import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardWelcome from "@/components/dashboard/DashboardWelcome";
import DashboardSignals from "@/components/dashboard/DashboardSignals";
import DashboardActiveWork from "@/components/dashboard/DashboardActiveWork";
import DashboardStrategy from "@/components/dashboard/DashboardStrategy";
import DashboardMomentum from "@/components/dashboard/DashboardMomentum";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import CloudUpgradeNudge from "@/components/dashboard/CloudUpgradeNudge";
import CaptureInput from "@/components/CaptureInput";
import { Sparkles, Inbox, FolderKanban, Brain, BarChart3 } from "lucide-react";
import { useFirstRun } from "@/hooks/useFirstRun";
import { useActivationFunnelTracker } from "@/hooks/useActivationFunnelTracker";
import { useFirstProductActions } from "@/hooks/useFirstProductActions";
import { useBrain } from "@/context/BrainContext";
import { useProjects } from "@/context/ProjectContext";
import { useMemory } from "@/context/MemoryContext";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
    </div>
  );
}

export default function Dashboard() {
  const isFirstRun = useFirstRun();
  const { captures } = useBrain();
  const { projects } = useProjects();
  const { memories } = useMemory();

  // Activation funnel tracking
  useActivationFunnelTracker();
  useFirstProductActions(captures.length, projects.length, memories.length);

  if (isFirstRun) {
    return (
      <div className="space-y-8">
        <DashboardWelcome />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHero />

      <SectionHeader icon={Inbox} label="Signals" />
      <DashboardSignals />

      <CloudUpgradeNudge />

      <section className="space-y-3">
        <SectionHeader icon={Sparkles} label="Quick Capture" />
        <CaptureInput />
      </section>

      <SectionHeader icon={Inbox} label="Alerts" />
      <DashboardAlerts />

      <SectionHeader icon={FolderKanban} label="Active Work" />
      <DashboardActiveWork />

      <SectionHeader icon={Brain} label="Strategy" />
      <DashboardStrategy />

      <SectionHeader icon={BarChart3} label="Momentum" />
      <DashboardMomentum />
    </div>
  );
}
