"use client";

import type { ImportExportHistoryEntry } from "@/types/studio-import";

const STORAGE_KEY = "chapmee-studio-import-history";
const MAX_ENTRIES = 50;

export function loadImportExportHistory(): ImportExportHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ImportExportHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveImportExportHistoryEntry(entry: ImportExportHistoryEntry): ImportExportHistoryEntry[] {
  const current = loadImportExportHistory();
  const next = [entry, ...current].slice(0, MAX_ENTRIES);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

/** TODO: Thay localStorage bằng bảng `studio_import_export_jobs` khi backend sẵn sàng. */
