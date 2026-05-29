type SessionCacheEntry<T> = {
  value: T;
  savedAt: number;
};

export function readSessionCache<T>(
  key: string,
  maxAgeMs: number,
  legacyKey?: string
): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    let raw = sessionStorage.getItem(key);
    if (!raw && legacyKey) {
      const legacyRaw = sessionStorage.getItem(legacyKey);
      if (legacyRaw) {
        sessionStorage.setItem(key, legacyRaw);
        sessionStorage.removeItem(legacyKey);
        raw = legacyRaw;
      }
    }
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as SessionCacheEntry<T>;
    if (Date.now() - entry.savedAt > maxAgeMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.value;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(
  key: string,
  value: T,
  legacyKey?: string
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entry: SessionCacheEntry<T> = { value, savedAt: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
    if (legacyKey) {
      sessionStorage.removeItem(legacyKey);
    }
  } catch {
    /* quota or private mode */
  }
}
