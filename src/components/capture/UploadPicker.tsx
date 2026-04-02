import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateFile, resolveFileKind, SUPPORTED_MIME_TYPES } from "@/lib/uploads";
import { toast } from "sonner";

const ALL_SUPPORTED = Object.values(SUPPORTED_MIME_TYPES).flat();
const MAX_FILES = 3;

export interface PendingFile {
  file: File;
  id: string;
  kind: ReturnType<typeof resolveFileKind>;
}

interface UploadPickerProps {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  disabled?: boolean;
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

    if (toAdd.length) onChange([...files, ...toAdd]);
    e.target.value = "";
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_FILES}
        className="gap-1.5 text-xs"
      >
        <Paperclip className="h-3.5 w-3.5" />
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
    </>
  );
}
