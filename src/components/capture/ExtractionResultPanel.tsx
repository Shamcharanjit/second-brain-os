/**
 * Expandable panel showing extraction results (summary, extracted text)
 * for a single attachment. Includes retry/re-run actions and quality indicators.
 */

import { useState } from "react";
import type { ExtractionRow } from "@/hooks/useCaptureExtractions";
import { triggerAttachmentExtraction } from "@/lib/extraction";
import { evaluateExtractionQuality, QUALITY_BAND_CONFIG } from "@/lib/attachment-extraction-quality";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  extraction: ExtractionRow;
  captureId: string;
  onRetryTriggered?: () => void;
}

const qualityIcons = {
  check: CheckCircle2,
  alert: AlertTriangle,
  info: Info,
  x: XCircle,
};

export default function ExtractionResultPanel({ extraction, captureId, onRetryTriggered }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!user?.id) return;
    setRetrying(true);
    try {
      await triggerAttachmentExtraction(extraction.attachment_id, captureId, user.id);
      toast.success("Re-analysis triggered");
      onRetryTriggered?.();
    } catch {
      toast.error("Failed to trigger re-analysis");
    } finally {
      setRetrying(false);
    }
  };

  // Unsupported — nothing to show
  if (extraction.status === "unsupported") return null;

  // Pending / processing — minimal
  if (extraction.status === "pending" || extraction.status === "processing") {
    return null; // badge already shows status
  }

  // Failed state
  if (extraction.status === "failed") {
    return (
      <div className="mt-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" />
          Analysis failed
        </div>
        {extraction.error_message && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {extraction.error_message}
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2"
          disabled={retrying}
          onClick={handleRetry}
        >
          {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Retry
        </Button>
      </div>
    );
  }

  // Completed — evaluate quality
  const quality = evaluateExtractionQuality(extraction);
  const QualityIcon = qualityIcons[QUALITY_BAND_CONFIG[quality.band].icon];
  const qualityColor = QUALITY_BAND_CONFIG[quality.band].color;

  const hasSummary = !!extraction.summary;
  const hasText = !!extraction.extracted_text;

  // Completed but empty/weak — show quality message instead of hiding
  if (quality.band === "empty") {
    return (
      <div className="mt-1.5 rounded-md border border-border/50 bg-secondary/40 px-3 py-2 space-y-1.5">
        <div className={`flex items-center gap-1.5 text-[10px] font-medium ${qualityColor}`}>
          <QualityIcon className="h-3 w-3" />
          {quality.label}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {quality.reason}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2"
          disabled={retrying}
          onClick={handleRetry}
        >
          {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Re-run
        </Button>
      </div>
    );
  }

  // Has content — show with quality indicator
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1.5">
      <div className="flex items-center gap-1">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] gap-0.5 px-1.5 text-primary hover:text-primary"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Sparkles className="h-3 w-3" />
            View analysis
          </Button>
        </CollapsibleTrigger>
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${qualityColor}`}>
          <QualityIcon className="h-2.5 w-2.5" />
          {quality.label}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
          title="Re-run analysis"
          disabled={retrying}
          onClick={handleRetry}
        >
          {retrying ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
        </Button>
      </div>

      <CollapsibleContent className="mt-1.5 space-y-2">
        {/* Low quality warning */}
        {quality.band === "low" && (
          <p className="text-[10px] text-muted-foreground italic px-1">
            {quality.reason}
          </p>
        )}

        {hasSummary && (
          <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
            <p className="text-[9px] font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Summary
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">{extraction.summary}</p>
          </div>
        )}

        {hasText && (
          <div className="rounded-md bg-secondary/60 border border-border/50 px-3 py-2">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="h-2.5 w-2.5" /> Extracted Text
            </p>
            <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
              {extraction.extracted_text}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
