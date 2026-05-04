/**
 * RecurrencePicker
 *
 * Small popover button shown in CaptureInput's toolbar row.
 * Lets users mark a capture as recurring (daily, weekdays, weekly, monthly).
 * When set, the capture auto-regenerates after completion.
 */

import { useState } from "react";
import { Repeat, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { RecurrenceType } from "@/types/brain";

const OPTIONS: { value: RecurrenceType; label: string; desc: string }[] = [
  { value: "daily",    label: "Daily",    desc: "Every day" },
  { value: "weekdays", label: "Weekdays", desc: "Mon – Fri" },
  { value: "weekly",   label: "Weekly",   desc: "Same day each week" },
  { value: "monthly",  label: "Monthly",  desc: "Same date each month" },
];

interface Props {
  value: RecurrenceType | null;
  onChange: (v: RecurrenceType | null) => void;
  disabled?: boolean;
}

export default function RecurrencePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const selected = OPTIONS.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={value ? "secondary" : "outline"}
          disabled={disabled}
          className={`gap-1.5 text-xs h-7 px-2 ${value ? "text-primary border-primary/30 bg-primary/5" : ""}`}
          title="Set recurrence"
        >
          <Repeat className="h-3 w-3" />
          {selected ? selected.label : "Repeat"}
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(null); setOpen(false); } }}
              className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent side="top" align="start" className="w-52 p-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
          Repeat this capture
        </p>
        <div className="space-y-0.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted ${
                value === opt.value ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <div>
                <p className="text-xs font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              {value === opt.value && <Check className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground text-center py-1.5 border-t"
          >
            Remove recurrence
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
