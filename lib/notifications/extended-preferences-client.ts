import { readStorageItem, STORAGE_KEYS, writeStorageItem } from "@/lib/brand/storage";
import type { NotificationPreferences } from "@/types/notification";

const STORAGE_KEY = STORAGE_KEYS.notificationPrefsExtended;

type ExtendedKeys = "community_enabled" | "wallet_enabled" | "creator_enabled";

const extendedKeys: ExtendedKeys[] = [
  "community_enabled",
  "wallet_enabled",
  "creator_enabled"
];

export function mergeExtendedNotificationPreferences(
  base: NotificationPreferences
): NotificationPreferences {
  if (typeof window === "undefined") {
    return base;
  }

  try {
    const raw = readStorageItem(STORAGE_KEY);
    if (!raw) {
      return base;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...base,
      community_enabled:
        typeof parsed.community_enabled === "boolean"
          ? parsed.community_enabled
          : base.community_enabled,
      wallet_enabled:
        typeof parsed.wallet_enabled === "boolean" ? parsed.wallet_enabled : base.wallet_enabled,
      creator_enabled:
        typeof parsed.creator_enabled === "boolean"
          ? parsed.creator_enabled
          : base.creator_enabled
    };
  } catch {
    return base;
  }
}

export function saveExtendedNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: Pick<NotificationPreferences, ExtendedKeys> = {
    community_enabled: preferences.community_enabled,
    wallet_enabled: preferences.wallet_enabled,
    creator_enabled: preferences.creator_enabled
  };

  writeStorageItem(STORAGE_KEY, JSON.stringify(payload));
}
