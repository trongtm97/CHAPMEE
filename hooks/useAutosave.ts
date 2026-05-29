"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { autosaveStudioDraftAction } from "@/lib/studio/draft-actions";
import {
  buildLocalDraftStorageKey,
  clearLocalDraftSnapshot,
  readLocalDraftSnapshot,
  writeLocalDraftSnapshot
} from "@/lib/studio/local-draft-storage";
import type { StudioDraftType } from "@/types/drafts";

export type AutosaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

type UseAutosaveOptions = {
  profileId: string;
  draftType: StudioDraftType;
  storyId?: string | null;
  chapterId?: string | null;
  enabled?: boolean;
  debounceMs?: number;
  getPayload: () => {
    title: string | null;
    content: Record<string, unknown>;
    plainText: string;
  };
  initialDraftId?: string | null;
  initialLastSavedAt?: string | null;
  onDraftId?: (draftId: string) => void;
};

export function useAutosave({
  chapterId,
  debounceMs = 4000,
  draftType,
  enabled = true,
  getPayload,
  initialDraftId,
  initialLastSavedAt,
  onDraftId,
  profileId,
  storyId
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialLastSavedAt ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localRecovery, setLocalRecovery] = useState<{
    snapshot: ReturnType<typeof readLocalDraftSnapshot>;
    key: string;
  } | null>(null);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastPayloadRef = useRef<string>("");
  const storageKey = buildLocalDraftStorageKey({
    chapterId,
    draftType,
    profileId,
    storyId
  });

  const persist = useCallback(
    async (createVersion: boolean) => {
      if (!enabled || savingRef.current) {
        return;
      }

      const payload = getPayload();
      const serialized = JSON.stringify(payload);

      if (!dirtyRef.current && serialized === lastPayloadRef.current) {
        return;
      }

      savingRef.current = true;
      setStatus("saving");
      setErrorMessage(null);

      const result = await autosaveStudioDraftAction({
        chapterId,
        content: payload.content,
        createVersion,
        draftType,
        plainText: payload.plainText,
        storyId,
        title: payload.title
      });

      savingRef.current = false;

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error ?? "Lưu thất bại");
        writeLocalDraftSnapshot(storageKey, {
          content: payload.content,
          plainText: payload.plainText,
          savedAt: new Date().toISOString(),
          title: payload.title
        });
        return;
      }

      lastPayloadRef.current = serialized;
      dirtyRef.current = false;
      clearLocalDraftSnapshot(storageKey);

      if (result.draftId) {
        setDraftId(result.draftId);
        onDraftId?.(result.draftId);
      }

      if (result.lastSavedAt) {
        setLastSavedAt(result.lastSavedAt);
      }

      setStatus("saved");
    },
    [
      chapterId,
      draftType,
      enabled,
      getPayload,
      onDraftId,
      storageKey,
      storyId
    ]
  );

  const markDirty = useCallback(() => {
    if (!enabled) {
      return;
    }

    dirtyRef.current = true;
    setStatus("dirty");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void persist(false);
    }, debounceMs);
  }, [debounceMs, enabled, persist]);

  const saveNow = useCallback(
    async (createVersion = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      dirtyRef.current = true;
      await persist(createVersion);
    },
    [persist]
  );

  const markSaved = useCallback(() => {
    dirtyRef.current = false;
    lastPayloadRef.current = JSON.stringify(getPayload());
    setStatus("saved");
    clearLocalDraftSnapshot(storageKey);
  }, [getPayload, storageKey]);

  useEffect(() => {
    const snapshot = readLocalDraftSnapshot(storageKey);

    if (!snapshot) {
      return;
    }

    const serverTime = initialLastSavedAt
      ? new Date(initialLastSavedAt).getTime()
      : 0;
    const localTime = new Date(snapshot.savedAt).getTime();

    if (localTime > serverTime) {
      setLocalRecovery({ key: storageKey, snapshot });
    }
  }, [initialLastSavedAt, storageKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const applyLocalRecovery = useCallback(() => {
    if (!localRecovery?.snapshot) {
      return null;
    }

    clearLocalDraftSnapshot(localRecovery.key);
    setLocalRecovery(null);
    markDirty();
    return localRecovery.snapshot;
  }, [localRecovery, markDirty]);

  const dismissLocalRecovery = useCallback(() => {
    if (localRecovery?.key) {
      clearLocalDraftSnapshot(localRecovery.key);
    }

    setLocalRecovery(null);
  }, [localRecovery]);

  const isDirty = status === "dirty" || status === "saving" || status === "error";

  return {
    applyLocalRecovery,
    dismissLocalRecovery,
    draftId,
    errorMessage,
    isDirty,
    lastSavedAt,
    localRecovery,
    markDirty,
    markSaved,
    saveNow,
    status
  };
}
