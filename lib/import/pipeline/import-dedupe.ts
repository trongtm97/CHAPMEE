import type { DatabaseClient } from "@/lib/db/types";
import {
  buildStoryDedupeKey,
  buildChapterDedupeKey,
  normalizeImportTitle
} from "@/lib/import/pipeline/import-dedupe-keys";

export type DedupeImportItemInput = {
  id: string;
  item_type: "story" | "chapter";
  parent_item_id: string | null;
  source_story_key: string | null;
  source_chapter_key: string | null;
  title: string;
  chapter_number: number | null;
  content_hash: string | null;
  status: string;
  error_message?: string | null;
};

export type DedupeContext = {
  sourceName: string | null;
  jobStoryKeys: Set<string>;
  jobChapterKeys: Set<string>;
  jobContentHashes: Set<string>;
};

export function createDedupeContext(sourceName: string | null): DedupeContext {
  return {
    sourceName,
    jobStoryKeys: new Set(),
    jobChapterKeys: new Set(),
    jobContentHashes: new Set()
  };
}

/** Marks duplicate items in-memory and against DB. Mutates context sets. */
export async function dedupeImportItems(
  db: DatabaseClient,
  items: DedupeImportItemInput[],
  context: DedupeContext
): Promise<{ duplicateCount: number }> {
  let duplicateCount = 0;

  const storyItems = items.filter((item) => item.item_type === "story");
  const chapterItems = items.filter((item) => item.item_type === "chapter");

  for (const item of storyItems) {
    if (item.status === "skipped" || item.status === "published") continue;
    const storyKey = item.source_story_key ?? buildStoryDedupeKey(item.title, context.sourceName);
    const reason = await findStoryDuplicateReason(db, storyKey, item.title, context);
    if (reason) {
      duplicateCount += 1;
      item.status = "duplicate";
      item.error_message = reason;
      continue;
    }
    context.jobStoryKeys.add(storyKey);
  }

  const storyKeyByItemId = new Map<string, string>();
  for (const item of storyItems) {
    storyKeyByItemId.set(
      item.id,
      item.source_story_key ?? buildStoryDedupeKey(item.title, context.sourceName)
    );
  }

  for (const item of chapterItems) {
    if (item.status === "skipped" || item.status === "published" || item.status === "duplicate") {
      continue;
    }

    const parentKey = item.parent_item_id
      ? storyKeyByItemId.get(item.parent_item_id)
      : item.source_story_key;
    const chapterKey = buildChapterDedupeKey(
      parentKey ?? "unknown",
      item.chapter_number,
      item.title
    );

    if (item.content_hash && context.jobContentHashes.has(item.content_hash)) {
      duplicateCount += 1;
      item.status = "duplicate";
      item.error_message = "Trùng content_hash trong cùng job.";
      continue;
    }

    if (context.jobChapterKeys.has(chapterKey)) {
      duplicateCount += 1;
      item.status = "duplicate";
      item.error_message = "Trùng chương trong cùng file import.";
      continue;
    }

    const dbDup = await findChapterDuplicateReason(db, {
      storyTitleKey: parentKey ?? undefined,
      sourceName: context.sourceName,
      chapterNumber: item.chapter_number,
      contentHash: item.content_hash
    });

    if (dbDup) {
      duplicateCount += 1;
      item.status = "duplicate";
      item.error_message = dbDup;
      continue;
    }

    context.jobChapterKeys.add(chapterKey);
    if (item.content_hash) {
      context.jobContentHashes.add(item.content_hash);
    }
    if (item.status === "parsed") {
      item.status = "ready";
    }
  }

  for (const item of storyItems) {
    if (item.status === "parsed") {
      item.status = "ready";
    }
  }

  return { duplicateCount };
}

async function findStoryDuplicateReason(
  db: DatabaseClient,
  storyKey: string,
  title: string,
  context: DedupeContext
): Promise<string | null> {
  if (context.jobStoryKeys.has(storyKey)) {
    return "Trùng truyện trong cùng file import.";
  }

  const { data: existingItem } = await db
    .from("import_items")
    .select("id")
    .eq("item_type", "story")
    .eq("source_story_key", storyKey)
    .in("status", ["ready", "published"])
    .limit(1)
    .maybeSingle();

  if (existingItem) {
    return "Trùng import story đã có trong hệ thống (source_story_key).";
  }

  const { data: storyRow } = await db
    .from("stories")
    .select("id, title")
    .ilike("title", `%${normalizeImportTitle(title)}%`)
    .limit(1)
    .maybeSingle();

  if (storyRow) {
    return `Trùng truyện đã tồn tại: ${storyRow.title}`;
  }

  return null;
}

async function findChapterDuplicateReason(
  db: DatabaseClient,
  input: {
    storyTitleKey?: string;
    sourceName: string | null;
    chapterNumber: number | null;
    contentHash: string | null;
  }
): Promise<string | null> {
  if (input.contentHash) {
    const { data: hashRow } = await db
      .from("episodes")
      .select("id, episode_number")
      .eq("content_hash", input.contentHash)
      .limit(1)
      .maybeSingle();

    if (hashRow) {
      return `Trùng nội dung chương (hash) với episode ${hashRow.id}.`;
    }

    const { data: itemHash } = await db
      .from("import_items")
      .select("id")
      .eq("content_hash", input.contentHash)
      .in("status", ["ready", "published"])
      .limit(1)
      .maybeSingle();

    if (itemHash) {
      return "Trùng content_hash với import_item khác.";
    }
  }

  if (!input.chapterNumber) {
    return null;
  }

  const { data: stories } = await db
    .from("stories")
    .select("id, title")
    .limit(20);

  const normalizedSource = (input.sourceName ?? "").toLowerCase();
  const story =
    (stories ?? []).find((row) => buildStoryDedupeKey(row.title, normalizedSource) === input.storyTitleKey) ??
    null;

  if (!story) {
    return null;
  }

  const { data: episodeRow } = await db
    .from("episodes")
    .select("id")
    .eq("story_id", story.id)
    .eq("episode_number", input.chapterNumber)
    .limit(1)
    .maybeSingle();

  if (episodeRow) {
    return `Chương ${input.chapterNumber} đã tồn tại trên truyện ${story.title}.`;
  }

  return null;
}
