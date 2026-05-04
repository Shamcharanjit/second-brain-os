/**
 * Data Export helpers — JSON, Markdown, CSV
 *
 * Exports all user data to a downloadable file.
 * Entirely client-side; no server round-trip needed.
 */

import type { Capture } from "@/types/brain";
import type { Project } from "@/types/project";
import type { MemoryEntry as Memory } from "@/types/memory";

type AIData = {
  title?: string;
  category?: string;
  priority_score?: number;
  urgency?: string;
  tags?: string[];
  next_action?: string;
  why_it_matters?: string;
  due_date?: string | null;
  suggested_project?: string;
};

// ── Trigger browser file download ──────────────────────────────────────────
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── JSON export ─────────────────────────────────────────────────────────────
export function exportJSON(
  captures: Capture[],
  projects: Project[],
  memories: Memory[],
) {
  const payload = {
    exported_at: new Date().toISOString(),
    version: "1.0",
    captures: captures.filter((c) => c.status !== "archived"),
    projects: projects.filter((p) => p.status !== "archived"),
    memories: memories.filter((m) => !m.is_archived),
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    `insighthalo-export-${today()}.json`,
    "application/json",
  );
}

// ── Markdown export ──────────────────────────────────────────────────────────
export function exportMarkdown(
  captures: Capture[],
  projects: Project[],
  memories: Memory[],
) {
  const lines: string[] = [];
  lines.push(`# InsightHalo Export — ${today()}`);
  lines.push("");

  // Captures
  lines.push("## Captures");
  lines.push("");
  const activeCaps = captures.filter((c) => c.status !== "archived");
  if (activeCaps.length === 0) {
    lines.push("_No captures yet._");
  } else {
    for (const c of activeCaps) {
      const ai = c.ai_data as AIData | null;
      const title = ai?.title || c.raw_input.slice(0, 80);
      lines.push(`### ${title}`);
      lines.push(`- **Category:** ${ai?.category ?? "—"}`);
      lines.push(`- **Priority:** ${ai?.priority_score ?? "—"}/100`);
      lines.push(`- **Urgency:** ${ai?.urgency ?? "—"}`);
      if (ai?.tags?.length) lines.push(`- **Tags:** ${ai.tags.join(", ")}`);
      if (ai?.next_action) lines.push(`- **Next action:** ${ai.next_action}`);
      if (ai?.due_date) lines.push(`- **Due:** ${ai.due_date}`);
      lines.push(`- **Status:** ${c.status}`);
      lines.push(`- **Captured:** ${c.created_at.slice(0, 10)}`);
      lines.push("");
      lines.push(c.raw_input);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  // Projects
  lines.push("## Projects");
  lines.push("");
  const activeProjects = projects.filter((p) => p.status !== "archived");
  if (activeProjects.length === 0) {
    lines.push("_No projects yet._");
  } else {
    for (const p of activeProjects) {
      lines.push(`### ${p.name}`);
      lines.push(`> ${p.description || "No description"}`);
      lines.push("");
      lines.push(`- **Status:** ${p.status} | **Priority:** ${p.priority} | **Progress:** ${p.progress}%`);
      if (p.due_date) lines.push(`- **Due:** ${p.due_date}`);
      lines.push("");
      const openActions = p.next_actions.filter((a) => !a.is_completed);
      if (openActions.length > 0) {
        lines.push("**Next actions:**");
        for (const a of openActions) lines.push(`- [ ] ${a.text}${a.is_primary ? " *(primary)*" : ""}`);
        lines.push("");
      }
      if (p.notes.length > 0) {
        lines.push("**Notes:**");
        for (const n of p.notes) lines.push(`- ${n.text}`);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }

  // Memories
  lines.push("## Memories");
  lines.push("");
  const activeMemories = memories.filter((m) => !m.is_archived);
  if (activeMemories.length === 0) {
    lines.push("_No memories yet._");
  } else {
    for (const m of activeMemories) {
      lines.push(`### ${m.title}`);
      if (m.summary) lines.push(`> ${m.summary}`);
      lines.push(`- **Type:** ${m.memory_type} | **Importance:** ${m.importance_score}/100`);
      lines.push("");
      lines.push(m.raw_text);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  downloadFile(lines.join("\n"), `insighthalo-export-${today()}.md`, "text/markdown");
}

// ── CSV export (captures only) ───────────────────────────────────────────────
export function exportCSV(captures: Capture[]) {
  const headers = [
    "ID", "Title", "Raw Input", "Category", "Status",
    "Priority", "Urgency", "Tags", "Next Action", "Due Date", "Captured At",
  ];

  const escape = (v: string | number | undefined | null) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = captures
    .filter((c) => c.status !== "archived")
    .map((c) => {
      const ai = c.ai_data as AIData | null;
      return [
        escape(c.id),
        escape(ai?.title ?? ""),
        escape(c.raw_input),
        escape(ai?.category ?? ""),
        escape(c.status),
        escape(ai?.priority_score ?? ""),
        escape(ai?.urgency ?? ""),
        escape(ai?.tags?.join("; ") ?? ""),
        escape(ai?.next_action ?? ""),
        escape(ai?.due_date ?? ""),
        escape(c.created_at.slice(0, 10)),
      ].join(",");
    });

  const csv = [headers.join(","), ...rows].join("\n");
  downloadFile(csv, `insighthalo-captures-${today()}.csv`, "text/csv");
}

// ── Notion-compatible JSON export ────────────────────────────────────────────
// Produces a JSON array of page objects that match the Notion API page schema.
// Each capture becomes a Notion "page" with properties you can import.
export function exportNotion(captures: Capture[], projects: Project[], memories: Memory[]) {
  const toNotionDate = (iso: string) => ({ start: iso.slice(0, 10) });

  const capturePages = captures
    .filter((c) => c.status !== "archived")
    .map((c) => {
      const ai = c.ai_data as AIData | null;
      return {
        object: "page",
        properties: {
          Name:       { title:    [{ text: { content: ai?.title ?? c.raw_input.slice(0, 100) } }] },
          Content:    { rich_text:[{ text: { content: c.raw_input } }] },
          Category:   { select:   { name: ai?.category ?? "note" } },
          Status:     { select:   { name: c.status } },
          Priority:   { number:   ai?.priority_score ?? 50 },
          Urgency:    { select:   { name: ai?.urgency ?? "low" } },
          Tags:       { multi_select: (ai?.tags ?? []).map((t) => ({ name: t })) },
          "Next Action": { rich_text: [{ text: { content: ai?.next_action ?? "" } }] },
          "Due Date": ai?.due_date ? { date: toNotionDate(ai.due_date) } : { date: null },
          "Captured At": { date: toNotionDate(c.created_at) },
          Source:     { select: { name: c.input_type === "voice" ? "Voice" : "Text" } },
        },
      };
    });

  const projectPages = projects
    .filter((p) => p.status !== "archived")
    .map((p) => ({
      object: "page",
      properties: {
        Name:     { title: [{ text: { content: p.name } }] },
        Content:  { rich_text: [{ text: { content: p.description ?? "" } }] },
        Status:   { select: { name: p.status } },
        Priority: { select: { name: p.priority } },
        Progress: { number: p.progress },
        "Due Date": p.due_date ? { date: toNotionDate(p.due_date) } : { date: null },
        "Next Actions": { rich_text: [{ text: { content: p.next_actions.filter((a) => !a.is_completed).map((a) => `• ${a.text}`).join("\n") } }] },
      },
    }));

  const memoryPages = memories
    .filter((m) => !m.is_archived)
    .map((m) => ({
      object: "page",
      properties: {
        Name:       { title: [{ text: { content: m.title } }] },
        Content:    { rich_text: [{ text: { content: m.raw_text } }] },
        Summary:    { rich_text: [{ text: { content: m.summary ?? "" } }] },
        Type:       { select: { name: m.memory_type } },
        Importance: { number: m.importance_score },
        Tags:       { multi_select: (m.tags ?? []).map((t: string) => ({ name: t })) },
      },
    }));

  const payload = {
    exported_at: new Date().toISOString(),
    format: "notion-compatible",
    version: "1.0",
    databases: {
      captures: capturePages,
      projects: projectPages,
      memories: memoryPages,
    },
  };

  downloadFile(
    JSON.stringify(payload, null, 2),
    `insighthalo-notion-${today()}.json`,
    "application/json",
  );
}

// ── Google Calendar / iCalendar (.ics) export ────────────────────────────────
// Exports tasks and reminders with due dates as VEVENT entries.
function icsDate(iso: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD (all-day event format)
  return iso.replace(/-/g, "");
}

function icsDateTime(iso: string): string {
  // Convert ISO datetime to YYYYMMDDTHHMMSSZ
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace(" ", "T");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function exportCalendar(captures: Capture[]) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InsightHalo//Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:InsightHalo Tasks`,
    `X-WR-TIMEZONE:UTC`,
  ];

  const taskCaptures = captures.filter((c) => {
    if (c.status === "archived" || c.is_completed) return false;
    const ai = c.ai_data as AIData | null;
    // Only include captures that have a due date OR are tasks/reminders
    return ai?.due_date || ai?.category === "task" || ai?.category === "reminder";
  });

  for (const c of taskCaptures) {
    const ai = c.ai_data as AIData | null;
    const uid = `${c.id}@insighthalo.com`;
    const summary = escapeIcs(ai?.title ?? c.raw_input.slice(0, 100));
    const description = escapeIcs([
      c.raw_input,
      ai?.next_action ? `Next: ${ai.next_action}` : "",
      ai?.tags?.length ? `Tags: ${ai.tags.join(", ")}` : "",
    ].filter(Boolean).join("\\n\\n"));

    const dtstamp = icsDateTime(c.created_at);
    const dtstart = ai?.due_date ? `DTSTART;VALUE=DATE:${icsDate(ai.due_date)}` : `DTSTART;VALUE=DATE:${icsDate(c.created_at)}`;
    const dtend   = ai?.due_date ? `DTEND;VALUE=DATE:${icsDate(ai.due_date)}` : `DTEND;VALUE=DATE:${icsDate(c.created_at)}`;

    const priority = ai?.urgency === "high" ? "1" : ai?.urgency === "medium" ? "5" : "9";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(dtstart);
    lines.push(dtend);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`PRIORITY:${priority}`);
    lines.push(`STATUS:NEEDS-ACTION`);
    if (ai?.category) lines.push(`CATEGORIES:${ai.category.toUpperCase()}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  downloadFile(
    lines.join("\r\n"),
    `insighthalo-tasks-${today()}.ics`,
    "text/calendar",
  );
}
