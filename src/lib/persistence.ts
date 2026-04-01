const SCHEMA_VERSIONS: Record<string, number> = {
  insighthalo_brain: 1,
  insighthalo_projects: 1,
  insighthalo_memory: 1,
  insighthalo_review: 1,
};

interface PersistedEnvelope<T> {
  version: number;
  data: T;
  savedAt: string;
}

export function saveState<T>(key: string, data: T): void {
  try {
    const envelope: PersistedEnvelope<T> = {
      version: SCHEMA_VERSIONS[key] ?? 1,
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const envelope: PersistedEnvelope<T> = JSON.parse(raw);
    const expectedVersion = SCHEMA_VERSIONS[key] ?? 1;
    if (envelope.version !== expectedVersion) {
      // Schema mismatch — clear stale data and use fallback
      localStorage.removeItem(key);
      return fallback;
    }
    if (envelope.data == null) return fallback;
    return envelope.data;
  } catch {
    // Corrupt data — clear and use fallback
    localStorage.removeItem(key);
    return fallback;
  }
}

export function clearAllInsightHaloData(): void {
  Object.keys(SCHEMA_VERSIONS).forEach((key) => localStorage.removeItem(key));
}
