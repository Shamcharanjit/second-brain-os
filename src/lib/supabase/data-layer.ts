import { supabase, isSupabaseEnabled } from "@/lib/supabase/client";
import { Capture } from "@/types/brain";
import { Project } from "@/types/project";
import { MemoryEntry } from "@/types/memory";

async function resolveAuthenticatedUserId(fallbackUserId: string): Promise<string | null> {
  if (!isSupabaseEnabled) return fallbackUserId || null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn("resolveAuthenticatedUserId error:", error.message);
      return fallbackUserId || null;
    }

    return data.user?.id ?? fallbackUserId ?? null;
  } catch (error) {
    console.warn("resolveAuthenticatedUserId exception:", error);
    return fallbackUserId || null;
  }
}

// ─── Captures ───

export async function fetchCaptures(userId: string): Promise<Capture[]> {
  const { data, error } = await supabase
    .from("user_captures")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchCaptures error:", error); return []; }
  return (data ?? []).map(dbCaptureToCapture);
}

export async function upsertCaptures(userId: string, captures: Capture[]): Promise<void> {
  if (captures.length === 0) return;
  const writeUserId = await resolveAuthenticatedUserId(userId);
  if (!writeUserId) {
    console.warn("upsertCaptures skipped: missing authenticated user id");
    return;
  }

  const writeOk = await writeCaptures(writeUserId, captures);
  if (!writeOk) console.error("upsertCaptures error: failed to write captures");
}

/** Full replace: sync current + delete cloud records not in local confirmed set */
export async function syncCaptures(userId: string, captures: Capture[]): Promise<void> {
  const writeUserId = await resolveAuthenticatedUserId(userId);
  if (!writeUserId) {
    console.warn("syncCaptures skipped: missing authenticated user id");
    return;
  }

  if (captures.length > 0) {
    const writeOk = await writeCaptures(writeUserId, captures);
    if (!writeOk) { console.error("syncCaptures upsert error: failed to write captures"); return; }
  }

  // Delete only against confirmed cloud ids. Local temp ids should never be treated
  // as server records, otherwise freshly inserted rows get deleted immediately.
  const confirmedCloudIds = captures
    .map((c) => c.cloud_id ?? (c.id.startsWith("local-") ? null : c.id))
    .filter((id): id is string => Boolean(id));

  // Safety window: never delete cloud rows created within the last 60 seconds.
  // This prevents the race where writeCaptures inserts a row and updates localStorage
  // with the new cloud ID, but React state still has cloud_id=null — causing the
  // next syncCaptures call to see the row as an orphan and delete it.
  const ORPHAN_SAFE_WINDOW_MS = 60_000;
  const cutoffTs = new Date(Date.now() - ORPHAN_SAFE_WINDOW_MS).toISOString();

  const { data: cloudRows, error: fetchErr } = await supabase
    .from("user_captures")
    .select("id, created_at")
    .eq("user_id", writeUserId);
  if (fetchErr) { console.error("syncCaptures fetch error:", fetchErr); return; }

  const orphanIds = (cloudRows ?? [])
    .filter((r: any) => !confirmedCloudIds.includes(r.id) && r.created_at < cutoffTs)
    .map((r: any) => r.id);

  if (orphanIds.length > 0) {
    const { error: delErr } = await supabase.from("user_captures").delete().in("id", orphanIds);
    if (delErr) console.error("syncCaptures delete error:", delErr);
  }
}

async function writeCaptures(userId: string, captures: Capture[]): Promise<boolean> {
  const serverBackedCaptures = captures.filter((capture) => !!capture.cloud_id);
  const newCaptures = captures.filter((capture) => !capture.cloud_id);

  const rowsToInsert = newCaptures.map((capture) => captureInsertRow(userId, capture));
  const rowsToUpdate = serverBackedCaptures.map((capture) => captureUpdateRow(userId, capture));

  if (rowsToInsert.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("user_captures")
      .insert(rowsToInsert as any)
      .select("*");

    if (insertError) {
      console.error("writeCaptures insert error:", insertError);
      return false;
    }

    // Persist the server ids locally by matching on the unique local creation payload.
    const insertedBySignature = new Map(
      (insertedRows ?? []).map((row: any) => [captureSignature(row.raw_input, row.input_type, row.created_at), row.id])
    );

    const remappedCaptures = captures.map((capture) => {
      if (capture.cloud_id) return capture;
      const cloudId = insertedBySignature.get(captureSignature(capture.raw_input, capture.input_type, capture.created_at));
      if (!cloudId) return capture;
      capture.id = cloudId;
      capture.cloud_id = cloudId;
      return capture;
    });

    try {
      localStorage.setItem("insighthalo_pending_capture_id_rewrite", JSON.stringify({ at: Date.now() }));
    } catch {}

    const storageKeys = Object.keys(localStorage).filter((key) => key.startsWith("insighthalo_brain"));
    for (const storageKey of storageKeys) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const envelope = JSON.parse(raw);
        if (!Array.isArray(envelope?.data)) continue;
        envelope.data = envelope.data.map((item: Capture) => {
          const match = remappedCaptures.find((capture) => capture.raw_input === item.raw_input && capture.input_type === item.input_type && capture.created_at === item.created_at);
          return match ?? item;
        });
        localStorage.setItem(storageKey, JSON.stringify(envelope));
      } catch {}
    }
  }

  for (const row of rowsToUpdate) {
    const { cloud_id, ...updates } = row;
    const { error: updateError } = await supabase
      .from("user_captures")
      .update(updates as any)
      .eq("id", cloud_id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("writeCaptures update error:", updateError);
      return false;
    }
  }

  return true;
}

function dbCaptureToCapture(row: any): Capture {
  return {
    id: row.id,
    cloud_id: row.id,
    raw_input: row.raw_input,
    input_type: row.input_type === "voice" ? "voice" : "text",
    created_at: row.created_at,
    processed: row.processed,
    status: row.status,
    review_status: row.review_status,
    ai_data: row.ai_data,
    reviewed_at: row.reviewed_at,
    manually_adjusted: row.manually_adjusted,
    is_completed: row.is_completed,
    completed_at: row.completed_at,
    is_pinned_today: row.is_pinned_today,
    idea_status: row.idea_status,
    converted_to_project_at: row.converted_to_project_at,
    source_project_id: row.source_project_id,
    source_action_id: row.source_action_id,
    recurrence: row.recurrence ?? null,
    recurrence_parent_id: row.recurrence_parent_id ?? null,
  };
}

function normalizeInputType(value: any): "text" | "voice" {
  // Preserve voice captures verbatim. Anything other than the literal "voice"
  // falls back to "text" so Growth Intelligence (input_type='voice') counts correctly.
  return value === "voice" ? "voice" : "text";
}

function captureInsertRow(userId: string, c: Capture) {
  return {
    user_id: userId,
    raw_input: c.raw_input,
    input_type: normalizeInputType(c.input_type),
    created_at: c.created_at,
    processed: c.processed,
    status: c.status,
    review_status: c.review_status,
    ai_data: c.ai_data,
    reviewed_at: c.reviewed_at,
    manually_adjusted: c.manually_adjusted,
    is_completed: c.is_completed,
    completed_at: c.completed_at,
    is_pinned_today: c.is_pinned_today,
    idea_status: c.idea_status,
    converted_to_project_at: c.converted_to_project_at,
    source_project_id: c.source_project_id,
    source_action_id: c.source_action_id,
    recurrence: c.recurrence ?? null,
    recurrence_parent_id: c.recurrence_parent_id ?? null,
  };
}

function captureUpdateRow(userId: string, c: Capture) {
  return {
    cloud_id: c.cloud_id,
    user_id: userId,
    raw_input: c.raw_input,
    input_type: normalizeInputType(c.input_type),
    created_at: c.created_at,
    processed: c.processed,
    status: c.status,
    review_status: c.review_status,
    ai_data: c.ai_data,
    reviewed_at: c.reviewed_at,
    manually_adjusted: c.manually_adjusted,
    is_completed: c.is_completed,
    completed_at: c.completed_at,
    is_pinned_today: c.is_pinned_today,
    idea_status: c.idea_status,
    converted_to_project_at: c.converted_to_project_at,
    source_project_id: c.source_project_id,
    source_action_id: c.source_action_id,
    recurrence: c.recurrence ?? null,
    recurrence_parent_id: c.recurrence_parent_id ?? null,
  };
}

function captureSignature(rawInput: string, inputType: string, createdAt: string) {
  return `${rawInput}__${inputType}__${createdAt}`;
}

// ─── Projects ───

export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("user_projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchProjects error:", error); return []; }
  return (data ?? []).map(dbProjectToProject);
}

export async function upsertProjects(userId: string, projects: Project[]): Promise<void> {
  if (projects.length === 0) return;
  const rows = projects.map((p) => projectToDbRow(userId, p));
  const { error } = await supabase.from("user_projects").upsert(rows as any, { onConflict: "id" });
  if (error) console.error("upsertProjects error:", error);
}

/** Full replace: upsert current + delete cloud records not in local set */
export async function syncProjects(userId: string, projects: Project[]): Promise<void> {
  if (projects.length > 0) {
    const rows = projects.map((p) => projectToDbRow(userId, p));
    const { error } = await supabase.from("user_projects").upsert(rows as any, { onConflict: "id" });
    if (error) { console.error("syncProjects upsert error:", error); return; }
  }
  const localIds = projects.map((p) => p.id);
  const ORPHAN_SAFE_WINDOW_MS = 60_000;
  const cutoffTs = new Date(Date.now() - ORPHAN_SAFE_WINDOW_MS).toISOString();
  const { data: cloudRows, error: fetchErr } = await supabase
    .from("user_projects")
    .select("id, created_at")
    .eq("user_id", userId);
  if (fetchErr) { console.error("syncProjects fetch error:", fetchErr); return; }
  const orphanIds = (cloudRows ?? [])
    .filter((r: any) => !localIds.includes(r.id) && r.created_at < cutoffTs)
    .map((r: any) => r.id);
  if (orphanIds.length > 0) {
    const { error: delErr } = await supabase.from("user_projects").delete().in("id", orphanIds);
    if (delErr) console.error("syncProjects delete error:", delErr);
  }
}

function dbProjectToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority,
    progress: row.progress,
    color: row.color,
    next_actions: row.next_actions ?? [],
    notes: row.notes ?? [],
    timeline: row.timeline ?? [],
    linked_capture_ids: row.linked_capture_ids ?? [],
    source_idea_id: row.source_idea_id,
    created_at: row.created_at,
    last_updated: row.updated_at,
    due_date: row.due_date,
  };
}

function projectToDbRow(userId: string, p: Project) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    description: p.description,
    status: p.status,
    priority: p.priority,
    progress: p.progress,
    color: p.color,
    next_actions: p.next_actions,
    notes: p.notes,
    timeline: p.timeline,
    linked_capture_ids: p.linked_capture_ids,
    source_idea_id: p.source_idea_id,
    created_at: p.created_at,
    updated_at: p.last_updated,
    due_date: p.due_date,
  };
}

// ─── Memory Entries ───

export async function fetchMemories(userId: string): Promise<MemoryEntry[]> {
  const { data, error } = await supabase
    .from("user_memory_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchMemories error:", error); return []; }
  return (data ?? []).map(dbMemoryToMemory);
}

export async function upsertMemories(userId: string, memories: MemoryEntry[]): Promise<void> {
  if (memories.length === 0) return;
  const rows = memories.map((m) => memoryToDbRow(userId, m));
  const { error } = await supabase.from("user_memory_entries").upsert(rows as any, { onConflict: "id" });
  if (error) console.error("upsertMemories error:", error);
}

/** Full replace: upsert current + delete cloud records not in local set */
export async function syncMemories(userId: string, memories: MemoryEntry[]): Promise<void> {
  if (memories.length > 0) {
    const rows = memories.map((m) => memoryToDbRow(userId, m));
    const { error } = await supabase.from("user_memory_entries").upsert(rows as any, { onConflict: "id" });
    if (error) { console.error("syncMemories upsert error:", error); return; }
  }
  const localIds = memories.map((m) => m.id);
  const ORPHAN_SAFE_WINDOW_MS = 60_000;
  const cutoffTs = new Date(Date.now() - ORPHAN_SAFE_WINDOW_MS).toISOString();
  const { data: cloudRows, error: fetchErr } = await supabase
    .from("user_memory_entries")
    .select("id, created_at")
    .eq("user_id", userId);
  if (fetchErr) { console.error("syncMemories fetch error:", fetchErr); return; }
  const orphanIds = (cloudRows ?? [])
    .filter((r: any) => !localIds.includes(r.id) && r.created_at < cutoffTs)
    .map((r: any) => r.id);
  if (orphanIds.length > 0) {
    const { error: delErr } = await supabase.from("user_memory_entries").delete().in("id", orphanIds);
    if (delErr) console.error("syncMemories delete error:", delErr);
  }
}

function dbMemoryToMemory(row: any): MemoryEntry {
  return {
    id: row.id,
    title: row.title,
    raw_text: row.raw_text,
    summary: row.summary,
    memory_type: row.memory_type,
    tags: row.tags ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_pinned: row.is_pinned,
    is_archived: row.is_archived,
    linked_project_ids: row.linked_project_ids ?? [],
    linked_idea_ids: row.linked_idea_ids ?? [],
    source_capture_id: row.source_capture_id,
    last_reviewed_at: row.last_reviewed_at,
    importance_score: row.importance_score,
  };
}

function memoryToDbRow(userId: string, m: MemoryEntry) {
  return {
    id: m.id,
    user_id: userId,
    title: m.title,
    raw_text: m.raw_text,
    summary: m.summary,
    memory_type: m.memory_type,
    tags: m.tags,
    is_pinned: m.is_pinned,
    is_archived: m.is_archived,
    linked_project_ids: m.linked_project_ids,
    linked_idea_ids: m.linked_idea_ids,
    source_capture_id: m.source_capture_id,
    last_reviewed_at: m.last_reviewed_at,
    importance_score: m.importance_score,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

// ─── Review Meta ───

interface ReviewMeta {
  last_daily_review_at: string | null;
  last_weekly_review_at: string | null;
}

export async function fetchReviewMeta(userId: string): Promise<ReviewMeta | null> {
  const { data, error } = await supabase
    .from("user_review_meta")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) { console.error("fetchReviewMeta error:", error); return null; }
  if (!data) return null;
  return { last_daily_review_at: data.last_daily_review_at, last_weekly_review_at: data.last_weekly_review_at };
}

export async function upsertReviewMeta(userId: string, meta: ReviewMeta): Promise<void> {
  if (!userId) return;
  // Skip when nothing meaningful to persist (avoids spurious 400s on first hydrate)
  if (!meta.last_daily_review_at && !meta.last_weekly_review_at) return;

  const payload = {
    user_id: userId,
    last_daily_review_at: meta.last_daily_review_at,
    last_weekly_review_at: meta.last_weekly_review_at,
    updated_at: new Date().toISOString(),
  };

  // Manual upsert (select → update/insert) avoids ON CONFLICT edge cases
  // that surface as 400s when the unique index is not visible to PostgREST cache.
  try {
    const { data: existing } = await supabase
      .from("user_review_meta")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("user_review_meta")
        .update(payload as any)
        .eq("user_id", userId);
      if (error) console.warn("upsertReviewMeta update skipped:", error.message);
    } else {
      const { error } = await supabase.from("user_review_meta").insert(payload as any);
      if (error && error.code !== "23505") {
        console.warn("upsertReviewMeta insert skipped:", error.message);
      }
    }
  } catch (e) {
    console.warn("upsertReviewMeta exception:", e);
  }
}
