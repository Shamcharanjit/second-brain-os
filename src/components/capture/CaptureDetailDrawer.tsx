/**
 * Capture detail drawer — shows full capture content + attachment gallery.
 * Opens as a sheet/drawer from right side.
 */

import { useState, useCallback } from "react";
import { shareCapture } from "@/lib/sharing";
import { Capture } from "@/types/brain";
import { useCaptureAttachmentDetails } from "@/hooks/useCaptureAttachments";
import { useCaptureExtractions } from "@/hooks/useCaptureExtractions";
import { useCaptureEnrichedContext } from "@/hooks/useCaptureEnrichedContext";
import { buildCaptureAIInput } from "@/lib/capture-enrichment";
import { runAITriage, triageToAIData } from "@/lib/ai-triage";
import { useBrain } from "@/context/BrainContext";
import AttachmentGallery from "@/components/capture/AttachmentGallery";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  Mic, Type, Sparkles, Clock, ArrowRight, ChevronDown, ChevronRight, Brain, RefreshCw, Loader2, Share2,
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
  const { replaceCaptureAI } = useBrain();
  const [ctxOpen, setCtxOpen] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!capture || sharing) return;
    setSharing(true);
    try {
      const result = await shareCapture(capture);
      if (result) {
        await navigator.clipboard.writeText(result.url);
        toast.success("Share link copied to clipboard!", { description: result.url });
      } else {
        toast.error("Sharing requires sign-in.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not create share link.");
    } finally {
      setSharing(false);
    }
  }, [capture, sharing]);

  const handleReanalyze = useCallback(async () => {
    if (!capture || reanalyzing) return;
    setReanalyzing(true);
    try {
      const aiInput = buildCaptureAIInput({
        captureText: capture.raw_input,
        enrichedContextText: enrichment.enrichedContextText,
      });
      const result = await runAITriage(capture.raw_input, aiInput);
      const reviewStatus = result.triage.confidence >= 0.8 ? "auto_approved" as const : "needs_review" as const;
      replaceCaptureAI(capture.id, result.aiData, reviewStatus);
      toast.success("Re-analyzed with attachment intelligence", {
        description: result.usedEnrichedContext
          ? `Used ${enrichment.completedExtractionCount} attachment analysis${enrichment.completedExtractionCount !== 1 ? "es" : ""}`
          : "Analyzed with original text",
      });
    } catch {
      toast.error("Re-analysis failed. Please try again.");
    } finally {
      setReanalyzing(false);
    }
  }, [capture, enrichment, reanalyzing, replaceCaptureAI]);

  if (!capture) return null;

  const ai = capture.ai_data;
  const canReanalyze = enrichment.hasEnrichment && !reanalyzing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg leading-snug">
                {ai?.title ?? "Capture"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-xs mt-1">
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
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={handleShare}
              disabled={sharing}
              title="Copy share link"
            >
              {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
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
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Analysis
                </p>
                {canReanalyze && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-primary"
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                  >
                    {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Re-analyze with attachments
                  </Button>
                )}
              </div>
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

          {/* Re-analyze button when no AI data yet but enrichment available */}
          {!ai && canReanalyze && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={handleReanalyze}
              disabled={reanalyzing}
            >
              {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Analyze with attachment intelligence
            </Button>
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
