import CaptureInput from "@/components/CaptureInput";
import CaptureCard from "@/components/CaptureCard";
import { useBrain } from "@/context/BrainContext";

export default function Dashboard() {
  const { captures } = useBrain();
  const recent = captures.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Capture anything. AI organizes the rest.</p>
      </div>

      <CaptureInput />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Captures</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No captures yet. Type something above!</p>
        ) : (
          <div className="space-y-2">
            {recent.map((c) => (
              <CaptureCard key={c.id} capture={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
