import { IMPORT_CLEANUP_POLICY } from "@/types/import-pipeline";

/** Central retention / lifecycle constants for docs and scripts. */
export const STORAGE_LIFECYCLE = {
  import: IMPORT_CLEANUP_POLICY,
  chapterContentCacheTtlMs: () => {
    const raw = process.env.CHAPTER_CONTENT_CACHE_TTL_MS;
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= 60_000 && parsed <= 1_800_000) {
      return parsed;
    }
    return 900_000;
  },
  backup: {
    localPgDumpRetentionDays: 14,
    s3MirrorRetentionDays: 30
  },
  quarantineBeforeHardDelete: true
} as const;

export type StorageLifecycleSection = keyof typeof STORAGE_LIFECYCLE;
