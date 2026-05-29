import {
  readStorageItem,
  STORAGE_KEYS,
  writeStorageItem
} from "@/lib/brand/storage";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existing = readStorageItem(STORAGE_KEYS.analyticsSessionId);

    if (existing) {
      return existing;
    }

    const sessionId = createSessionId();
    writeStorageItem(STORAGE_KEYS.analyticsSessionId, sessionId);
    return sessionId;
  } catch {
    return null;
  }
}
