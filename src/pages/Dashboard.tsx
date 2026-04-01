import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardWelcome from "@/components/dashboard/DashboardWelcome";
import DashboardSignals from "@/components/dashboard/DashboardSignals";
import DashboardActiveWork from "@/components/dashboard/DashboardActiveWork";
import DashboardStrategy from "@/components/dashboard/DashboardStrategy";
import DashboardMomentum from "@/components/dashboard/DashboardMomentum";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import CloudUpgradeNudge from "@/components/dashboard/CloudUpgradeNudge";
import CaptureInput from "@/components/CaptureInput";
import { Sparkles } from "lucide-react";
import { useFirstRun } from "@/hooks/useFirstRun";

export default function Dashboard() {
  const isFirstRun = useFirstRun();

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
      <DashboardSignals />

      <CloudUpgradeNudge />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Capture</h2>
        </div>
        <CaptureInput />
      </section>

      <DashboardAlerts />
      <DashboardActiveWork />
      <DashboardStrategy />
      <DashboardMomentum />
    </div>
  );
}
