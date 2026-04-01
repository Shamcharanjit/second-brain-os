import { loadState, clearAllInsightHaloData } from "@/lib/persistence";

const KEYS = {
  captures: "insighthalo_brain",
  projects: "insighthalo_projects",
  memory: "insighthalo_memory",
  review: "insighthalo_review",
} as const;

export interface InsightHaloBackup {
  _format: "insighthalo_backup";
  _version: 1;
  _exportedAt: string;
  captures: unknown;
  projects: unknown;
  memory: unknown;
  review: unknown;
}

/** Export all local data as a JSON backup object. */
export function exportAllData(): InsightHaloBackup {
  return {
    _format: "insighthalo_backup",
    _version: 1,
    _exportedAt: new Date().toISOString(),
    captures: loadState(KEYS.captures, []),
    projects: loadState(KEYS.projects, []),
    memory: loadState(KEYS.memory, []),
    review: loadState(KEYS.review, {}),
  };
}

/** Download the backup as a .json file. */
export function downloadBackup() {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `insighthalo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Validate that a parsed object looks like a valid backup. */
export function validateBackup(obj: unknown): obj is InsightHaloBackup {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Record<string, unknown>;
  return b._format === "insighthalo_backup" && typeof b._version === "number" && Array.isArray(b.captures) && Array.isArray(b.projects) && Array.isArray(b.memory);
}

/** Restore a validated backup into localStorage (replaces local data). Returns true on success. */
export function restoreBackup(backup: InsightHaloBackup): boolean {
  try {
    const { saveState } = require("@/lib/persistence");
    saveState(KEYS.captures, backup.captures);
    saveState(KEYS.projects, backup.projects);
    saveState(KEYS.memory, backup.memory);
    if (backup.review) saveState(KEYS.review, backup.review);
    return true;
  } catch {
    return false;
  }
}

/** Read a File as parsed JSON. */
export function readFileAsJSON(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/** Clear all local InsightHalo data. */
export { clearAllInsightHaloData as clearLocalData };
