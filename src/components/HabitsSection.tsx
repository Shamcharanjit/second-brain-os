/**
 * HabitsSection — Recurring habits tracker shown at the top of TodayPage.
 *
 * Shows today's due habits as toggleable ring checkboxes.
 * Streak badge updates live. "+ Add habit" opens an inline form.
 */

import { useState } from "react";
import { useHabits } from "@/context/HabitContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Flame, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { HabitFrequency } from "@/types/habit";
import { toast } from "sonner";

const EMOJI_PRESETS = ["💪", "📚", "🧘", "🏃", "💧", "✍️", "🎯", "🌿", "☀️", "🧠"];

const FREQ_LABELS: Record<HabitFrequency, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

export default function HabitsSection() {
  const { todayHabits, habits, createHabit, toggleToday, isCompletedToday, getStreak, archiveHabit } = useHabits();
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("💪");
  const [newFreq, setNewFreq] = useState<HabitFrequency>("daily");

  const completedToday = todayHabits.filter((h) => isCompletedToday(h.id)).length;
  const allDone = todayHabits.length > 0 && completedToday === todayHabits.length;

  const handleAdd = () => {
    if (!newName.trim()) return;
    createHabit(newName.trim(), newEmoji, newFreq);
    setNewName("");
    setNewEmoji("💪");
    setNewFreq("daily");
    setAdding(false);
    toast.success("Habit added");
  };

  if (habits.length === 0 && !adding) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[hsl(var(--brain-amber))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Habits</h2>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Add habit
          </Button>
        </div>
        <p className="text-xs text-muted-foreground py-2">No habits yet. Add one to build daily momentum.</p>
        {adding && <AddHabitForm name={newName} setName={setNewName} emoji={newEmoji} setEmoji={setNewEmoji} freq={newFreq} setFreq={setNewFreq} onAdd={handleAdd} onCancel={() => setAdding(false)} />}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-2" onClick={() => setExpanded(!expanded)}>
          <Flame className={`h-4 w-4 ${allDone ? "text-[hsl(var(--brain-amber))] fill-[hsl(var(--brain-amber))]" : "text-[hsl(var(--brain-amber))]"}`} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Habits</h2>
          {todayHabits.length > 0 && (
            <Badge variant={allDone ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {completedToday}/{todayHabits.length}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {todayHabits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No habits due today.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {todayHabits.map((h) => {
                const done = isCompletedToday(h.id);
                const streak = getStreak(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => { toggleToday(h.id); if (!done) toast.success(`${h.emoji} ${h.name} — done!`); }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm group ${
                      done
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card hover:border-primary/30"
                    }`}
                  >
                    {/* Ring checkbox */}
                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      done ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover:border-primary/50"
                    }`}>
                      {done ? (
                        <span className="text-white text-sm">✓</span>
                      ) : (
                        <span className="text-base">{h.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                        {h.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{FREQ_LABELS[h.frequency]}</span>
                        {streak > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[hsl(var(--brain-amber))] font-semibold">
                            <Flame className="h-2.5 w-2.5 fill-[hsl(var(--brain-amber))]" />
                            {streak}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); archiveHabit(h.id); toast("Habit removed"); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 text-muted-foreground/40 hover:text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                );
              })}
            </div>
          )}

          {adding && (
            <AddHabitForm
              name={newName} setName={setNewName}
              emoji={newEmoji} setEmoji={setNewEmoji}
              freq={newFreq} setFreq={setNewFreq}
              onAdd={handleAdd} onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </section>
  );
}

function AddHabitForm({
  name, setName, emoji, setEmoji, freq, setFreq, onAdd, onCancel,
}: {
  name: string; setName: (v: string) => void;
  emoji: string; setEmoji: (v: string) => void;
  freq: HabitFrequency; setFreq: (v: HabitFrequency) => void;
  onAdd: () => void; onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Emoji picker */}
      <div className="flex gap-1.5 flex-wrap">
        {EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-lg rounded-lg p-1.5 transition-all ${emoji === e ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted"}`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Habit name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm flex-1"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") onAdd(); if (e.key === "Escape") onCancel(); }}
        />
        <Select value={freq} onValueChange={(v) => setFreq(v as HabitFrequency)}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekdays">Weekdays</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={onAdd} disabled={!name.trim()}>
          <Plus className="h-3 w-3" /> Add Habit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
