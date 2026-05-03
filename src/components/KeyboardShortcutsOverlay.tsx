/**
 * KeyboardShortcutsOverlay
 *
 * Triggered by pressing "?" anywhere in the app.
 * Lists all keyboard shortcuts in a clean modal.
 * Wired via AppLayout's global keydown handler.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutGroup {
  group: string;
  items: { keys: string[]; description: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    group: "Navigation",
    items: [
      { keys: ["⌘K", "Ctrl+K"], description: "Open command palette / global search" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close dialogs / cancel" },
    ],
  },
  {
    group: "Capture",
    items: [
      { keys: ["⌘J", "Ctrl+J"], description: "Quick capture (open anywhere)" },
    ],
  },
  {
    group: "Inbox",
    items: [
      { keys: ["↑↓"], description: "Navigate between captures" },
      { keys: ["Enter"], description: "Open selected capture detail" },
    ],
  },
  {
    group: "Today",
    items: [
      { keys: ["Drag"], description: "Reorder items in the queue" },
    ],
  },
  {
    group: "Command Palette",
    items: [
      { keys: ["↑↓"], description: "Move between results" },
      { keys: ["↵ Enter"], description: "Go to selected item" },
      { keys: ["Esc"], description: "Close palette" },
    ],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function KeyboardShortcutsOverlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {SHORTCUTS.map((group) => (
            <div key={group.group} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, ki) => (
                        <span key={ki} className="flex items-center gap-1">
                          {ki > 0 && (
                            <span className="text-[10px] text-muted-foreground/50">/</span>
                          )}
                          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground shadow-sm">
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 pt-2 border-t">
          Press <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">Esc</kbd> to close
        </p>
      </DialogContent>
    </Dialog>
  );
}
