/**
 * TemplatePicker
 *
 * Popover button in the CaptureInput toolbar.
 * Clicking a template pre-fills the textarea with a structured prompt
 * so AI triage gets better context and the user captures faster.
 */

import { useState } from "react";
import { LayoutTemplate, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface CaptureTemplate {
  id: string;
  label: string;
  emoji: string;
  prompt: string;   // pre-fills the textarea
}

export const CAPTURE_TEMPLATES: CaptureTemplate[] = [
  {
    id: "meeting-notes",
    label: "Meeting Notes",
    emoji: "📋",
    prompt: "Meeting with [who] about [topic]\n\nKey points:\n- \n\nAction items:\n- \n\nDecisions made:\n- ",
  },
  {
    id: "book-summary",
    label: "Book Summary",
    emoji: "📖",
    prompt: "Book: [title] by [author]\n\nBig idea: \n\nKey takeaways:\n- \n\nHow I'll apply this: ",
  },
  {
    id: "daily-reflection",
    label: "Daily Reflection",
    emoji: "🌅",
    prompt: "Daily reflection — " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + "\n\nWin today: \n\nWhat drained me: \n\nTomorrow I'll focus on: ",
  },
  {
    id: "project-idea",
    label: "Project Idea",
    emoji: "💡",
    prompt: "Project idea: [name]\n\nProblem it solves: \n\nWho it's for: \n\nFirst step: \n\nOpen questions: \n- ",
  },
  {
    id: "bug-issue",
    label: "Bug / Issue",
    emoji: "🐛",
    prompt: "Bug: [short description]\n\nSteps to reproduce:\n1. \n\nExpected: \nActual: \n\nPriority: ",
  },
  {
    id: "weekly-plan",
    label: "Weekly Plan",
    emoji: "📅",
    prompt: "Week of " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + "\n\nTop 3 priorities:\n1. \n2. \n3. \n\nCarry-overs from last week:\n- \n\nAnything to defer: ",
  },
];

interface Props {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export default function TemplatePicker({ onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          title="Use a template"
        >
          <LayoutTemplate className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-64 p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Templates</span>
          <button onClick={() => setOpen(false)}>
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        <div className="space-y-0.5">
          {CAPTURE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent text-left transition-colors"
              onClick={() => {
                onSelect(t.prompt);
                setOpen(false);
              }}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              <span className="font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
