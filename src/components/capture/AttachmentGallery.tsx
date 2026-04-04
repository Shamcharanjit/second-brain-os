/**
 * Attachment gallery for capture detail view.
 * Fetches signed URLs on demand, shows image previews,
 * and provides open/download actions for other file types.
 */

import { useState, useCallback } from "react";
import { CaptureAttachment } from "@/lib/uploads";
import { getSignedUrl } from "@/lib/storage";
import { formatFileSize, getAttachmentKind } from "@/lib/format-file";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  FileText,
  Music,
  File,
  Download,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  attachments: CaptureAttachment[];
  loading?: boolean;
  error?: string | null;
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

export default function AttachmentGallery({ attachments, loading, error }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  if (attachments.length === 0) return null;

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

            return (
              <div
                key={att.id}
                className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2.5 group"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {kindLabel[kind]} · {formatFileSize(att.file_size)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {kind === "image" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={isLoading}
                      onClick={() => openSignedUrl(att, "preview")}
                      title="Preview"
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  {kind === "audio" && att.mime_type && (
                    <InlineAudioPlayer att={att} />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    disabled={isLoading}
                    onClick={() => openSignedUrl(att, "open")}
                    title="Open / Download"
                  >
                    {isLoading && kind !== "image" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
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
    </>
  );
}

/** Tiny inline audio player — fetches signed URL on play */
function InlineAudioPlayer({ att }: { att: CaptureAttachment }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    if (audioUrl) return; // already loaded
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
      disabled={loading}
      onClick={handlePlay}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Music className="h-3 w-3" />}
      Play
    </Button>
  );
}
