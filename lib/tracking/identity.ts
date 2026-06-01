import { getAnalyticsSessionId } from "@/lib/analytics/session";
import {
  readStorageItem,
  STORAGE_KEYS
} from "@/lib/brand/storage";

export function getTrackingSessionId() {
  return getAnalyticsSessionId();
}

/** Persistent anonymous id when experiments storage is available. */
export function getTrackingAnonymousId() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    readStorageItem(STORAGE_KEYS.experimentsAnonymousId) ??
    getAnalyticsSessionId()
  );
}
