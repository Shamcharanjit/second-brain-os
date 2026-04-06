/**
 * Attachment gallery for capture detail view.
 * Fetches signed URLs on demand, shows image previews,
 * and provides open/download/delete actions for file types.
 */

import { useState, useCallback } from "react";
import { CaptureAttachment } from "@/lib/uploads";
import { getSignedUrl } from "@/lib/storage";
import { formatFileSize, getAttachmentKind } from "@/lib/format-file";
import { useDeleteCaptureAttachment } from "@/hooks/useDeleteCaptureAttachment";
import type { ExtractionRow } from "@/hooks/useCaptureExtractions";
import {
  getExtractionDisplayState,
  getExtractionStatusLabel,
  getExtractionStatusClassName,
  getExtractionRecoveryMessage,
} from "@/lib/attachment-extraction-state";
import ExtractionResultPanel from "@/components/capture/ExtractionResultPanel";
import { triggerAttachmentExtraction } from "@/lib/extraction";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  FileText,
  Music,
  File,
  Download,
  Eye,
  Loader2,
  Trash2,
  Play,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  attachments: CaptureAttachment[];
  captureId?: string;
  loading?: boolean;
  error?: string | null;
  extractions?: ExtractionRow[];
  onDeleted?: () => void;
  onRetryTriggered?: () => void;
}

const kindIcon = {
  image: ImageIcon,
  pdf: FileText,
  audio: Music,
  other: File,
};

const kindLabel = {
  image: "Image",
  pdf: "PDF",
  audio: "Audio",
  other: "File",
};

export default function AttachmentGallery({ attachments, captureId, loading, error, extractions, onDeleted, onRetryTriggered }: Props) {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<CaptureAttachment | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const { deletingId, deleteAttachment } = useDeleteCaptureAttachment();

  /** Trigger extraction for an attachment that has no extraction row. */
  const handleTriggerAnalysis = useCallback(async (att: CaptureAttachment) => {
    if (!user?.id || !captureId) return;
    setTriggeringId(att.id);
    try {
      await triggerAttachmentExtraction(att.id, captureId, user.id);
      toast.success("Analysis triggered");
      onRetryTriggered?.();
    } catch {
      toast.error("Failed to trigger analysis");
    } finally {
      setTriggeringId(null);
    }
  }, [user?.id, captureId, onRetryTriggered]);

  const openSignedUrl = useCallback(async (att: CaptureAttachment, action: "preview" | "open") => {
    setLoadingId(att.id);
    const { url, error: err } = await getSignedUrl(att.storage_path);
    setLoadingId(null);

    if (err || !url) {
      toast.error("Could not generate file link", { description: err ?? "Try again." });
      return;
    }

    const kind = getAttachmentKind(att.mime_type);

    if (action === "preview" && kind === "image") {
      setPreviewUrl(url);
      setPreviewName(att.file_name);
    } else {
      window.open(url, "_blank", "noopener");
    }
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmTarget) return;
    deleteAttachment(confirmTarget, () => {
      setConfirmTarget(null);
      onDeleted?.();
    });
  }, [confirmTarget, deleteAttachment, onDeleted]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading attachments…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        Failed to load attachments: {error}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="py-3 text-xs text-muted-foreground text-center">
        No attachments
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Attachments ({attachments.length})
        </p>
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const kind = getAttachmentKind(att.mime_type);
            const Icon = kindIcon[kind];
            const isLoading = loadingId === att.id;
            const isDeleting = deletingId === att.id;
            const extraction = extractions?.find((e) => e.attachment_id === att.id);
            const displayState = getExtractionDisplayState(extraction ?? null);
            const stateLabel = getExtractionStatusLabel(displayState);
            const stateClass = getExtractionStatusClassName(displayState);
            const recoveryMsg = getExtractionRecoveryMessage(displayState);
            const isMissingOrStale = displayState === "missing" || displayState === "stale";

              return (
                <div key={att.id} className="space-y-0">
                  <div
                    className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2.5 group"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.file_name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          {kindLabel[kind]} · {formatFileSize(att.file_size)}
                        </p>
                        {stateLabel && (
                          <span className={`text-[9px] font-medium ${stateClass}`}>{stateLabel}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {kind === "image" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={isLoading || isDeleting}
                          onClick={() => openSignedUrl(att, "preview")}
                          title="Preview"
                        >
                          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {kind === "audio" && att.mime_type && (
                        <InlineAudioPlayer att={att} disabled={isDeleting} />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        disabled={isLoading || isDeleting}
                        onClick={() => openSignedUrl(att, "open")}
                        title="Open / Download"
                      >
                        {isLoading && kind !== "image" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isDeleting}
                        onClick={() => setConfirmTarget(att)}
                        title="Remove attachment"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Missing / stale recovery block */}
                  {isMissingOrStale && captureId && (
                    <div className="mt-1 rounded-md border border-border/50 bg-secondary/30 px-3 py-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground">{recoveryMsg}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] gap-1 px-2"
                        disabled={triggeringId === att.id}
                        onClick={() => handleTriggerAnalysis(att)}
                      >
                        {triggeringId === att.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {displayState === "stale" ? "Try again" : "Run analysis"}
                      </Button>
                    </div>
                  )}

                  {/* Normal extraction results */}
                  {extraction && captureId && !isMissingOrStale && (
                    <ExtractionResultPanel
                      extraction={extraction}
                      captureId={captureId}
                      onRetryTriggered={onRetryTriggered}
                    />
                  )}
                </div>
            );
          })}
        </div>
      </div>

      {/* Image preview lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl p-2">
          <DialogTitle className="sr-only">{previewName}</DialogTitle>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={previewName}
              className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
              loading="lazy"
            />
          )}
          <p className="text-xs text-muted-foreground text-center pt-1 truncate">{previewName}</p>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{confirmTarget?.file_name}</span> from this capture.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Tiny inline audio player — fetches signed URL on play */
function InlineAudioPlayer({ att, disabled }: { att: CaptureAttachment; disabled?: boolean }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    if (audioUrl) return;
    setLoading(true);
    const { url, error } = await getSignedUrl(att.storage_path);
    setLoading(false);
    if (error || !url) {
      toast.error("Could not load audio");
      return;
    }
    setAudioUrl(url);
  };

  if (audioUrl) {
    return (
      <audio controls className="h-7 max-w-[160px]" src={audioUrl} />
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-[10px] gap-1 px-2"
      disabled={loading || disabled}
      onClick={handlePlay}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Music className="h-3 w-3" />}
      Play
    </Button>
  );
}

/** Tiny extraction status badge */
function ExtractionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending analysis", className: "text-muted-foreground" },
    processing: { label: "Analyzing…", className: "text-primary animate-pulse" },
    completed: { label: "✓ Analyzed", className: "text-[hsl(var(--brain-teal))]" },
    failed: { label: "Analysis failed", className: "text-destructive" },
    unsupported: { label: "", className: "" },
  };
  const c = config[status] ?? config.unsupported;
  if (!c.label) return null;
  return <span className={`text-[9px] font-medium ${c.className}`}>{c.label}</span>;
}
