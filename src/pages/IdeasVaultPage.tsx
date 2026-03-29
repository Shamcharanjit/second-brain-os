import { useBrain } from "@/context/BrainContext";
import CaptureCard from "@/components/CaptureCard";

export default function IdeasVaultPage() {
  const { captures } = useBrain();

  const ideas = captures.filter(
    (c) => c.status !== "archived" &&
    (c.status === "sent_to_ideas" || c.ai_data?.category === "idea" || c.ai_data?.category === "maybe_later")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ideas Vault</h1>
        <p className="text-sm text-muted-foreground mt-1">Non-urgent ideas and "maybe later" thoughts.</p>
      </div>

      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No ideas stored yet. Capture something creative!</p>
      ) : (
        <div className="space-y-2">
          {ideas.map((c) => <CaptureCard key={c.id} capture={c} />)}
        </div>
      )}
    </div>
  );
}
