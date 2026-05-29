/**
 * LocalStorage keys — prefix `chapmee:`.
 * Đọc key cũ `chapchap*` một lần rồi migrate sang key mới (không mất dữ liệu người dùng).
 */

export const STORAGE_KEYS = {
  meActivities: "chapmee:me-activities",
  messageUnread: "chapmee:message-unread",
  messageUnreadRefreshEvent: "chapmee:message-unread-refresh",
  mobileTopBar: "chapmee:mobile-top-bar",
  coinBalance: "chapmee:coin-balance",
  readingPreferences: "chapmee:reading-preferences",
  privacySettings: "chapmee:privacy-settings",
  notificationPrefsExtended: "chapmee:notification-prefs-extended",
  experimentsAnonymousId: "chapmee.experiments.anonymous_id",
  experimentsAssignments: "chapmee.experiments.assignments",
  analyticsSessionId: "chapmee.analytics.session_id"
} as const;

const LEGACY_MAP: Record<string, string> = {
  [STORAGE_KEYS.meActivities]: "chapchap:me-activities",
  [STORAGE_KEYS.messageUnread]: "chapchap:message-unread",
  [STORAGE_KEYS.messageUnreadRefreshEvent]: "chapchap:message-unread-refresh",
  [STORAGE_KEYS.mobileTopBar]: "chapchap:mobile-top-bar",
  [STORAGE_KEYS.coinBalance]: "chapchap:coin-balance",
  [STORAGE_KEYS.readingPreferences]: "chapchap-reading-preferences",
  [STORAGE_KEYS.privacySettings]: "chapchap-privacy-settings",
  [STORAGE_KEYS.notificationPrefsExtended]: "chapchap_notification_prefs_extended",
  [STORAGE_KEYS.experimentsAnonymousId]: "chapchap.experiments.anonymous_id",
  [STORAGE_KEYS.experimentsAssignments]: "chapchap.experiments.assignments",
  [STORAGE_KEYS.analyticsSessionId]: "chapchap.analytics.session_id"
};

export function pollVoteStorageKey(pollId: string) {
  return `chapmee:poll-vote-${pollId}`;
}

export function pollVoteStorageKeyLegacy(pollId: string) {
  return `chapchap-poll-vote-${pollId}`;
}

export function feedPollStorageKey(itemId: string) {
  return `chapmee:feed-poll-${itemId}`;
}

export function feedPollStorageKeyLegacy(itemId: string) {
  return `chapchap-feed-poll-${itemId}`;
}

export function readStorageItem(primaryKey: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const current = window.localStorage.getItem(primaryKey);
  if (current !== null) {
    return current;
  }

  const legacyKey = LEGACY_MAP[primaryKey];
  if (!legacyKey) {
    return null;
  }

  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy === null) {
    return null;
  }

  window.localStorage.setItem(primaryKey, legacy);
  window.localStorage.removeItem(legacyKey);
  return legacy;
}

export function writeStorageItem(primaryKey: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(primaryKey, value);
  const legacyKey = LEGACY_MAP[primaryKey];
  if (legacyKey) {
    window.localStorage.removeItem(legacyKey);
  }
}

export function removeStorageItem(primaryKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(primaryKey);
  const legacyKey = LEGACY_MAP[primaryKey];
  if (legacyKey) {
    window.localStorage.removeItem(legacyKey);
  }
}

/** Poll keys: thử key mới rồi key cũ theo id. */
export function readPollVote(pollId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const primary = pollVoteStorageKey(pollId);
  const current = window.localStorage.getItem(primary);
  if (current !== null) {
    return current;
  }

  const legacy = pollVoteStorageKeyLegacy(pollId);
  const old = window.localStorage.getItem(legacy);
  if (old === null) {
    return null;
  }

  window.localStorage.setItem(primary, old);
  window.localStorage.removeItem(legacy);
  return old;
}

export function writePollVote(pollId: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(pollVoteStorageKey(pollId), value);
  window.localStorage.removeItem(pollVoteStorageKeyLegacy(pollId));
}

export function readFeedPollVote(itemId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const primary = feedPollStorageKey(itemId);
  const current = window.localStorage.getItem(primary);
  if (current !== null) {
    return current;
  }

  const legacy = feedPollStorageKeyLegacy(itemId);
  const old = window.localStorage.getItem(legacy);
  if (old === null) {
    return null;
  }

  window.localStorage.setItem(primary, old);
  window.localStorage.removeItem(legacy);
  return old;
}

export function writeFeedPollVote(itemId: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(feedPollStorageKey(itemId), value);
  window.localStorage.removeItem(feedPollStorageKeyLegacy(itemId));
}
