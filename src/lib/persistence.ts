const SCHEMA_VERSIONS: Record<string, number> = {
  insighthalo_brain: 1,
  insighthalo_projects: 1,
  insighthalo_memory: 1,
  insighthalo_review: 1,
};

const CURRENT_USER_KEY = "insighthalo_current_user";

interface PersistedEnvelope<T> {
  version: number;
  data: T;
  savedAt: string;
}

/** Get user-scoped storage key. Falls back to base key when no user. */
function scopedKey(key: string): string {
  const userId = localStorage.getItem(CURRENT_USER_KEY);
  return userId ? `${key}_${userId}` : key;
}

export function saveState<T>(key: string, data: T): void {
  try {
    const envelope: PersistedEnvelope<T> = {
      version: SCHEMA_VERSIONS[key] ?? 1,
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(scopedKey(key), JSON.stringify(envelope));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    if (!raw) return fallback;
    const envelope: PersistedEnvelope<T> = JSON.parse(raw);
    const expectedVersion = SCHEMA_VERSIONS[key] ?? 1;
    if (envelope.version !== expectedVersion) {
      localStorage.removeItem(scopedKey(key));
      return fallback;
    }
    if (envelope.data == null) return fallback;
    return envelope.data;
  } catch {
    localStorage.removeItem(scopedKey(key));
    return fallback;
  }
}

export function clearAllInsightHaloData(): void {
  Object.keys(SCHEMA_VERSIONS).forEach((key) => {
    localStorage.removeItem(scopedKey(key));
    // Also remove unscoped legacy keys
    localStorage.removeItem(key);
  });
}

/**
 * Set the current user for scoped storage.
 * Returns true if the user changed (requiring state reset).
 */
export function setCurrentUser(userId: string | null): boolean {
  const prev = localStorage.getItem(CURRENT_USER_KEY);
  const changed = prev !== null && prev !== userId;

  if (userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  return changed;
}

/** Migrate unscoped legacy data to the user-scoped key (one-time). */
export function migrateUnscopedData(userId: string): void {
  Object.keys(SCHEMA_VERSIONS).forEach((key) => {
    const scoped = `${key}_${userId}`;
    // Only migrate if scoped key doesn't exist but unscoped does
    if (!localStorage.getItem(scoped) && localStorage.getItem(key)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        localStorage.setItem(scoped, raw);
        localStorage.removeItem(key);
      }
    }
  });
}
