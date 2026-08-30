import { randomUUID } from "node:crypto";
import { buildStoryDedupeKey, buildChapterDedupeKey } from "@/lib/import/pipeline/import-dedupe-keys";
import {
  createDedupeContext,
  dedupeImportItems,
  type DedupeImportItemInput
} from "@/lib/import/pipeline/import-dedupe";
import {
  getImportJobById,
  listImportItemsForJob,
  updateImportJob,
  updateImportItem
} from "@/lib/import/pipeline/import-jobs";
import { assertNoEncodingIssuesInImportText } from "@/lib/encoding/detect-encoding-issues";
import { decodeImportTextBytes } from "@/lib/encoding/decode-import-text";
import { parseImportFile } from "@/lib/import/pipeline/import-parser";
import {
  downloadRawImportFile,
  uploadProcessedChapterText
} from "@/lib/import/pipeline/import-storage";
import type { DatabaseClient } from "@/lib/db/types";
import {
  IMPORT_RAW_PREVIEW_MAX_CHARS,
  type ImportItemRow
} from "@/types/import-pipeline";

export type ParseImportJobResult =
  | { ok: true; totalItems: number; duplicateCount: number }
  | { ok: false; error: string };

export async function parseImportJob(
  db: DatabaseClient,
  jobId: string
): Promise<ParseImportJobResult> {
  const job = await getImportJobById(db, jobId);
  if (!job) {
    return { ok: false, error: "Không tìm thấy import job." };
  }

  if (job.status === "cancelled") {
    return { ok: false, error: "Job đã hủy — không parse." };
  }

  if (job.status === "published") {
    return { ok: false, error: "Job đã publish — tạo job mới để import lại." };
  }

  if (job.status === "publishing") {
    return { ok: false, error: "Job đang publish — đợi hoàn tất." };
  }

  if (!job.rights_attested_at) {
    return {
      ok: false,
      error: "Chưa xác nhận quyền sử dụng nội dung. Upload lại file để ghi nhận đồng ý bản quyền."
    };
  }

  await updateImportJob(db, jobId, {
    status: "parsing",
    error_message: null
  });

  try {
    const existing = await listImportItemsForJob(db, jobId);
    if (existing.length > 0) {
      await db.from("import_items").delete().eq("import_job_id", jobId);
    }

    const rawBuffer = await downloadRawImportFile(job.raw_object_key);
    const rawText = decodeImportTextBytes(new Uint8Array(rawBuffer)).replace(/^\uFEFF/, "");
    const encodingCheck = assertNoEncodingIssuesInImportText(
      rawText,
      "File import"
    );
    if (!encodingCheck.ok) {
      await updateImportJob(db, jobId, {
        status: "failed",
        error_message: encodingCheck.error
      });
      return { ok: false, error: encodingCheck.error };
    }
    const filename = job.original_filename ?? "import.txt";
    const parsed = parseImportFile(rawText, filename);

    if (!parsed.ok) {
      await updateImportJob(db, jobId, {
        status: "failed",
        error_message: parsed.error
      });
      return { ok: false, error: parsed.error };
    }

    const storyKey = buildStoryDedupeKey(parsed.data.story.title, job.source_name);
    const storyItemId = randomUUID();

    const { error: storyInsertError } = await db.from("import_items").insert({
      id: storyItemId,
      import_job_id: jobId,
      item_type: "story",
      source_story_key: storyKey,
      title: parsed.data.story.title,
      status: "parsed",
      metadata: {
        author: parsed.data.story.author ?? null,
        format: parsed.data.format
      }
    });

    if (storyInsertError) {
      throw new Error(storyInsertError.message);
    }

    const stagedItems: DedupeImportItemInput[] = [
      {
        id: storyItemId,
        item_type: "story",
        parent_item_id: null,
        source_story_key: storyKey,
        source_chapter_key: null,
        title: parsed.data.story.title,
        chapter_number: null,
        content_hash: null,
        status: "parsed"
      }
    ];

    let failedCount = 0;

    for (const chapter of parsed.data.chapters) {
      const chapterItemId = randomUUID();
      try {
        const stored = await uploadProcessedChapterText({
          importJobId: jobId,
          itemId: chapterItemId,
          text: chapter.content
        });

        const chapterKey = buildChapterDedupeKey(
          storyKey,
          chapter.chapterNumber,
          chapter.title
        );

        const { error: chapterInsertError } = await db.from("import_items").insert({
          id: chapterItemId,
          import_job_id: jobId,
          item_type: "chapter",
          parent_item_id: storyItemId,
          source_story_key: storyKey,
          source_chapter_key: chapterKey,
          title: parsed.data.story.title,
          chapter_title: chapter.title,
          chapter_number: chapter.chapterNumber,
          raw_text_preview: chapter.content.slice(0, IMPORT_RAW_PREVIEW_MAX_CHARS),
          parsed_content_object_key: stored.objectKey,
          content_hash: chapter.contentHash,
          status: "parsed",
          metadata: {
            word_count: chapter.wordCount,
            excerpt: chapter.excerpt,
            processed_encoding: stored.encoding,
            processed_size_bytes: stored.sizeBytes
          }
        });

        if (chapterInsertError) {
          throw new Error(chapterInsertError.message);
        }

        stagedItems.push({
          id: chapterItemId,
          item_type: "chapter",
          parent_item_id: storyItemId,
          source_story_key: storyKey,
          source_chapter_key: chapterKey,
          title: parsed.data.story.title,
          chapter_number: chapter.chapterNumber,
          content_hash: chapter.contentHash,
          status: "parsed"
        });
      } catch (error) {
        failedCount += 1;
        await db.from("import_items").insert({
          id: chapterItemId,
          import_job_id: jobId,
          item_type: "chapter",
          parent_item_id: storyItemId,
          source_story_key: storyKey,
          source_chapter_key: buildChapterDedupeKey(storyKey, chapter.chapterNumber, chapter.title),
          title: parsed.data.story.title,
          chapter_title: chapter.title,
          chapter_number: chapter.chapterNumber,
          status: "failed",
          error_message: error instanceof Error ? error.message : "Lưu processed thất bại."
        });
      }
    }

    const dedupeContext = createDedupeContext(job.source_name);
    const { duplicateCount } = await dedupeImportItems(db, stagedItems, dedupeContext);

    for (const item of stagedItems) {
      await updateImportItem(db, item.id, {
        status: item.status as ImportItemRow["status"],
        error_message: item.error_message ?? null
      });
    }

    const readyCount = stagedItems.filter(
      (item) => item.status === "ready" || item.status === "parsed"
    ).length;

    await updateImportJob(db, jobId, {
      status: "parsed",
      total_items: stagedItems.length + failedCount,
      success_count: readyCount,
      failed_count: failedCount,
      duplicate_count: duplicateCount,
      error_message: failedCount > 0 ? `${failedCount} chương lưu processed thất bại.` : null
    });

    return {
      ok: true,
      totalItems: stagedItems.length,
      duplicateCount
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse thất bại.";
    await updateImportJob(db, jobId, {
      status: "failed",
      error_message: message
    });
    return { ok: false, error: message };
  }
}
