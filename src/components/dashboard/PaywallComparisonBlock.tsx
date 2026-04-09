import { Check, X } from "lucide-react";

const FEATURES = [
  { name: "AI daily limit", free: "5 / day", pro: "Unlimited" },
  { name: "Priority AI processing", free: false, pro: true },
  { name: "Advanced insights", free: false, pro: true },
  { name: "AI memory connections", free: false, pro: true },
  { name: "Priority support", free: false, pro: true },
  { name: "Future features access", free: "Limited", pro: "Full" },
];

export default function PaywallComparisonBlock() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-3 text-xs font-medium border-b bg-muted/30">
        <div className="px-4 py-3 text-muted-foreground">Feature</div>
        <div className="px-4 py-3 text-center text-muted-foreground">Early Access</div>
        <div className="px-4 py-3 text-center text-primary">Pro</div>
      </div>
      {FEATURES.map((f) => (
        <div key={f.name} className="grid grid-cols-3 text-xs border-b last:border-0">
          <div className="px-4 py-2.5 text-foreground">{f.name}</div>
          <div className="px-4 py-2.5 text-center text-muted-foreground">
            {typeof f.free === "boolean" ? (
              f.free ? <Check className="h-3.5 w-3.5 text-primary mx-auto" /> : <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
            ) : f.free}
          </div>
          <div className="px-4 py-2.5 text-center text-primary font-medium">
            {typeof f.pro === "boolean" ? (
              <Check className="h-3.5 w-3.5 text-primary mx-auto" />
            ) : f.pro}
          </div>
        </div>
      ))}
    </div>
  );
}
