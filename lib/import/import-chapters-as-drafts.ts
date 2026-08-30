import { applyEpisodeObjectStorageAfterSave } from "@/lib/chapters/apply-episode-object-storage-save";
import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { countWords } from "@/lib/text/countWords";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getChapterUrl } from "@/lib/urls/paths";
import { resolveContentSlug } from "@/lib/urls/slug";
import { BULK_IMPORT_TITLE_MAX, type BulkImportImportResult } from "@/types/import";
import type { DatabaseClient } from "@/lib/db/types";

export type ImportChapterDraftInput = {
  chapterNumber: number;
  title: string;
  content: string;
};

export async function getExistingEpisodeNumbers(
  db: DatabaseClient,
  storyId: string
) {
  const { data, error } = await db
    .from("episodes")
    .select("episode_number")
    .eq("story_id", storyId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => Number(row.episode_number));
}

export async function importChaptersAsDrafts(
  db: DatabaseClient,
  storyId: string,
  chapters: ImportChapterDraftInput[]
): Promise<BulkImportImportResult> {
  const existingNumbers = new Set(await getExistingEpisodeNumbers(db, storyId));
  const errors: BulkImportImportResult["errors"] = [];
  let importedCount = 0;
  let skippedCount = 0;

  const { data: storyRow } = await db
    .from("stories")
    .select("slug, public_code")
    .eq("id", storyId)
    .maybeSingle();

  const storySlug = String(storyRow?.slug ?? "");
  const storyPublicCode = String(storyRow?.public_code ?? "");

  for (const chapter of chapters) {
    if (existingNumbers.has(chapter.chapterNumber)) {
      skippedCount += 1;
      errors.push({
        chapterNumber: chapter.chapterNumber,
        message: `Chương ${chapter.chapterNumber} đã tồn tại — bỏ qua.`
      });
      continue;
    }

    const content = sanitizePlainContent(chapter.content);
    const title = chapter.title.trim().slice(0, BULK_IMPORT_TITLE_MAX) || `Chương ${chapter.chapterNumber}`;

    const excerpt = createExcerpt(content, 40, 80);

    if (!storyPublicCode || !storySlug) {
      skippedCount += 1;
      errors.push({
        chapterNumber: chapter.chapterNumber,
        message: `Chương ${chapter.chapterNumber}: truyện thiếu mã public URL.`
      });
      continue;
    }

    let chapterPublicCode: string;
    try {
      chapterPublicCode = await generateNumericPublicCode(db, "chapter");
    } catch (codeError) {
      skippedCount += 1;
      errors.push({
        chapterNumber: chapter.chapterNumber,
        message:
          codeError instanceof Error
            ? codeError.message
            : `Chương ${chapter.chapterNumber}: không tạo được mã chương.`
      });
      continue;
    }

    const chapterSlug = resolveContentSlug(title, "chapter", chapterPublicCode);
    const canonicalPath = getChapterUrl(
      { slug: storySlug, public_code: storyPublicCode },
      { slug: chapterSlug, public_code: chapterPublicCode }
    );

    const { data: inserted, error } = await db
      .from("episodes")
      .insert({
        canonical_path: canonicalPath,
        content,
        episode_number: chapter.chapterNumber,
        excerpt,
        public_code: chapterPublicCode,
        slug: chapterSlug,
        status: "draft",
        story_id: storyId,
        title,
        word_count: countWords(content)
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      skippedCount += 1;
      errors.push({
        chapterNumber: chapter.chapterNumber,
        message:
          error?.code === "23505"
            ? `Chương ${chapter.chapterNumber} đã tồn tại.`
            : (error?.message ?? "Không tạo được chương.")
      });
      continue;
    }

    const storageResult = await applyEpisodeObjectStorageAfterSave(db, {
      storyId,
      chapterId: String(inserted.id),
      content,
      structuredContent: null,
      contentFormat: "plain_text",
      excerpt
    });

    if (!storageResult.ok) {
      skippedCount += 1;
      errors.push({
        chapterNumber: chapter.chapterNumber,
        message: `Chương ${chapter.chapterNumber}: ${storageResult.error}`
      });
      await db.from("episodes").delete().eq("id", inserted.id);
      continue;
    }

    existingNumbers.add(chapter.chapterNumber);
    importedCount += 1;
  }

  if (importedCount === 0) {
    const firstReason = errors[0]?.message;

    return {
      errors,
      error: firstReason
        ? `Không nhập được chương nào. ${firstReason}`
        : "Không nhập được chương nào — có thể do trùng số chương đã tồn tại.",
      importedCount: 0,
      ok: false,
      skippedCount
    };
  }

  return {
    errors,
    importedCount,
    ok: true,
    skippedCount
  };
}
