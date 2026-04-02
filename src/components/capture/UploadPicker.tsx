import { useRef } from "react";
import { Paperclip, X, FileText, Image, Music, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateFile, resolveFileKind, MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/uploads";
import { toast } from "sonner";

const ALL_SUPPORTED = Object.values(SUPPORTED_MIME_TYPES).flat();
const MAX_FILES = 3;

export interface PendingFile {
  file: File;
  id: string; // local unique key
  kind: ReturnType<typeof resolveFileKind>;
}

interface UploadPickerProps {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  disabled?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function KindIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "image": return <Image className="h-3.5 w-3.5 text-primary" />;
    case "audio": return <Music className="h-3.5 w-3.5 text-primary" />;
    case "document": return <FileText className="h-3.5 w-3.5 text-primary" />;
    default: return <File className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export default function UploadPicker({ files, onChange, disabled }: UploadPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files per capture.`);
      e.target.value = "";
      return;
    }

    const toAdd: PendingFile[] = [];

    for (const file of selected.slice(0, remaining)) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error ?? "Invalid file");
        continue;
      }
      toAdd.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: resolveFileKind(file.type),
      });
    }

    if (selected.length > remaining) {
      toast.warning(`Only ${remaining} more file(s) allowed. Some were skipped.`);
    }

    if (toAdd.length) {
      onChange([...files, ...toAdd]);
    }

    // Reset so selecting the same file again works
    e.target.value = "";
  };

  const handleRemove = (id: string) => {
    onChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Trigger button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_FILES}
        className="gap-1.5 text-xs"
      >
        <Paperclip className="h-3.5 w-3.5" />
        Attach
        {files.length > 0 && (
          <span className="text-[9px] text-muted-foreground">({files.length}/{MAX_FILES})</span>
        )}
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALL_SUPPORTED.join(",")}
        onChange={handleSelect}
        className="hidden"
      />

      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((pf) => (
            <div
              key={pf.id}
              className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-xs"
            >
              <KindIcon kind={pf.kind} />
              <span className="max-w-[120px] truncate text-foreground">{pf.file.name}</span>
              <span className="text-muted-foreground">{formatSize(pf.file.size)}</span>
              <button
                type="button"
                onClick={() => handleRemove(pf.id)}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${pf.file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
