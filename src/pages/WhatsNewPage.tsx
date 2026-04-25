import { Sparkles } from "lucide-react";
import WhatsNewTimeline from "@/components/WhatsNewTimeline";

export default function WhatsNewPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">What's New</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every improvement we ship — so your second brain keeps getting sharper.
        </p>
      </header>

      <WhatsNewTimeline markAllSeenOnMount />
    </div>
  );
}
