import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { countWords } from "@/lib/text/countWords";
import { BULK_IMPORT_TITLE_MAX, type BulkImportImportResult } from "@/types/import";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ImportChapterDraftInput = {
  chapterNumber: number;
  title: string;
  content: string;
};

export async function getExistingEpisodeNumbers(
  supabase: SupabaseClient,
  storyId: string
) {
  const { data, error } = await supabase
    .from("episodes")
    .select("episode_number")
    .eq("story_id", storyId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => Number(row.episode_number));
}

export async function importChaptersAsDrafts(
  supabase: SupabaseClient,
  storyId: string,
  chapters: ImportChapterDraftInput[]
): Promise<BulkImportImportResult> {
  const existingNumbers = new Set(await getExistingEpisodeNumbers(supabase, storyId));
  const errors: BulkImportImportResult["errors"] = [];
  let importedCount = 0;
  let skippedCount = 0;

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

    const { error } = await supabase.from("episodes").insert({
      content,
      episode_number: chapter.chapterNumber,
      excerpt: createExcerpt(content, 40, 80),
      status: "draft",
      story_id: storyId,
      title,
      word_count: countWords(content)
    });

    if (error) {
      skippedCount += 1;
      errors.push({
        chapterNumber: chapter.chapterNumber,
        message:
          error.code === "23505"
            ? `Chương ${chapter.chapterNumber} đã tồn tại.`
            : error.message
      });
      continue;
    }

    existingNumbers.add(chapter.chapterNumber);
    importedCount += 1;
  }

  if (importedCount === 0) {
    return {
      errors,
      error: "Không nhập được chương nào. Vui lòng kiểm tra lại.",
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
