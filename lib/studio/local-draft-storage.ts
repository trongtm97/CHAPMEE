import type { StudioDraftType } from "@/types/drafts";

export type LocalDraftSnapshot = {
  savedAt: string;
  title: string | null;
  content: Record<string, unknown>;
  plainText: string | null;
};

export function buildLocalDraftStorageKey(input: {
  profileId: string;
  draftType: StudioDraftType;
  storyId?: string | null;
  chapterId?: string | null;
}) {
  return [
    "chapmee-studio-local-draft",
    input.profileId,
    input.draftType,
    input.storyId ?? "none",
    input.chapterId ?? "none"
  ].join(":");
}

export function readLocalDraftSnapshot(key: string): LocalDraftSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as LocalDraftSnapshot;
  } catch {
    return null;
  }
}

export function writeLocalDraftSnapshot(key: string, snapshot: LocalDraftSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Quota exceeded — bỏ qua, server autosave vẫn là nguồn chính.
  }
}

export function clearLocalDraftSnapshot(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}
