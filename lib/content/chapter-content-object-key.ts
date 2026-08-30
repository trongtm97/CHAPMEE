import type { ChapterContentBlobFormat } from "@/lib/content/chapter-content-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_KEY_FRAGMENT = /[\s/\\]|localhost|127\.0\.0\.1|https?:|\.com\b/i;

function assertSafeId(label: string, value: string) {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    throw new Error(`${label} must be a UUID`);
  }
  if (FORBIDDEN_KEY_FRAGMENT.test(trimmed)) {
    throw new Error(`${label} contains invalid characters for object keys`);
  }
  return trimmed.toLowerCase();
}

function formatExtension(format: ChapterContentBlobFormat) {
  return format;
}

function yearMonthSegments(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return { yyyy, mm };
}

export type BuildChapterContentObjectKeyInput = {
  storyId: string;
  chapterId: string;
  format: ChapterContentBlobFormat;
  /** Defaults to current UTC date for yyyy/mm path. */
  date?: Date;
  /** When true, append .gz (default true — objects are gzip-compressed). */
  gzip?: boolean;
};

/**
 * Stable chapter content object key (no titles, domains, or bucket name).
 *
 * `story-content/{yyyy}/{mm}/{storyId}/chapters/{chapterId}.{format}[.gz]`
 */
export function buildChapterContentObjectKey(input: BuildChapterContentObjectKeyInput): string {
  const storyId = assertSafeId("storyId", input.storyId);
  const chapterId = assertSafeId("chapterId", input.chapterId);
  const date = input.date ?? new Date();
  const { yyyy, mm } = yearMonthSegments(date);
  const ext = formatExtension(input.format);
  const gzip = input.gzip !== false;
  const suffix = gzip ? ".gz" : "";
  return `story-content/${yyyy}/${mm}/${storyId}/chapters/${chapterId}.${ext}${suffix}`;
}

/** Alias required by storage plan / prompts. */
export const getChapterContentObjectKey = buildChapterContentObjectKey;
