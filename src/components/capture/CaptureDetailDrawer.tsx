/**
 * Capture detail drawer — shows full capture content + attachment gallery.
 * Opens as a sheet/drawer from right side.
 */

import { useState } from "react";
import { Capture } from "@/types/brain";
import { useCaptureAttachmentDetails } from "@/hooks/useCaptureAttachments";
import { useCaptureExtractions } from "@/hooks/useCaptureExtractions";
import { useCaptureEnrichedContext } from "@/hooks/useCaptureEnrichedContext";
import AttachmentGallery from "@/components/capture/AttachmentGallery";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Mic, Type, Sparkles, Clock, ArrowRight, ChevronDown, ChevronRight, Brain,
} from "lucide-react";

interface Props {
  capture: Capture | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CaptureDetailDrawer({ capture, open, onOpenChange }: Props) {
  const { attachments, loading, error, refetch } = useCaptureAttachmentDetails(
    open && capture ? capture.id : null
  );
  const { extractions, refetch: refetchExtractions } = useCaptureExtractions(
    open && capture ? capture.id : null
  );
  const enrichment = useCaptureEnrichedContext({ capture, attachments, extractions });
  const [ctxOpen, setCtxOpen] = useState(false);

  if (!capture) return null;

  const ai = capture.ai_data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg leading-snug">
            {ai?.title ?? "Capture"}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              {capture.input_type === "voice" ? <Mic className="h-3 w-3" /> : <Type className="h-3 w-3" />}
              {capture.input_type === "voice" ? "Voice" : "Text"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(capture.created_at), { addSuffix: true })}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Raw input */}
          <div className="rounded-lg bg-secondary/60 border border-border/50 px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Original Capture
            </p>
            <p className="text-sm text-foreground/90 italic leading-relaxed">
              "{capture.raw_input}"
            </p>
          </div>

          {/* AI summary */}
          {ai && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 space-y-3">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Analysis
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{ai.summary}</p>

              {ai.next_action && (
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-primary">{ai.next_action}</p>
                </div>
              )}

              {ai.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ai.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          <AttachmentGallery
            attachments={attachments}
            captureId={capture.id}
            loading={loading}
            error={error}
            extractions={extractions}
            onDeleted={() => { refetch(); refetchExtractions(); }}
            onRetryTriggered={() => { setTimeout(refetchExtractions, 2000); }}
          />

          {/* Enrichment context preview */}
          {enrichment.hasEnrichment && (
            <Collapsible open={ctxOpen} onOpenChange={setCtxOpen}>
              <div className="flex items-center gap-1.5">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-primary">
                    {ctxOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <Brain className="h-3 w-3" />
                    AI Context Preview
                  </Button>
                </CollapsibleTrigger>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  Uses {enrichment.completedExtractionCount} analysis{enrichment.completedExtractionCount !== 1 ? "es" : ""}
                </Badge>
              </div>
              <CollapsibleContent className="mt-2">
                <div className="rounded-md bg-secondary/40 border border-border/40 px-3 py-2 max-h-48 overflow-y-auto">
                  <p className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
                    {enrichment.enrichedContextText}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
