import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CaptureInput from "@/components/CaptureInput";
import { Brain } from "lucide-react";

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCaptureModal({ open, onOpenChange }: QuickCaptureModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Quick Capture
          </DialogTitle>
          <DialogDescription>
            Dump your thought here. AI will organize it into your Inbox.
          </DialogDescription>
        </DialogHeader>
        <CaptureInput variant="modal" onComplete={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
