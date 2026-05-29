"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  getExistingEpisodeNumbers,
  importChaptersAsDrafts
} from "@/lib/import/import-chapters-as-drafts";
import { parseBulkImportTemplate } from "@/lib/import/parse-bulk-import-template";
import {
  buildImportChapterPreviews,
  validateImportInputSize,
  validatePreviewForImport
} from "@/lib/import/validate-import-chapters";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";
import { BULK_IMPORT_MAX_CHAPTERS, type ImportChapterPreview } from "@/types/import";

async function getActor() {
  const creatorState = await getCurrentCreatorProfile();

  if (!creatorState.creatorProfile || !creatorState.user) {
    return { error: "Bạn cần đăng nhập Studio.", ok: false as const };
  }

  return {
    creatorProfile: creatorState.creatorProfile,
    ok: true as const
  };
}

export async function previewBulkImportAction(input: {
  storyId: string;
  text: string;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, previews: [] as ImportChapterPreview[] };
  }

  const sizeCheck = validateImportInputSize(input.text);

  if (!sizeCheck.ok) {
    return { error: sizeCheck.error, previews: [] as ImportChapterPreview[] };
  }

  try {
    await assertCreatorOwnsStory(actor.creatorProfile, input.storyId);
  } catch {
    return { error: "Bạn không có quyền với truyện này.", previews: [] };
  }

  const parsed = parseBulkImportTemplate(input.text);

  if (parsed.chapters.length === 0) {
    return {
      error: parsed.parseErrors[0] ?? "Không tìm thấy chương nào.",
      parseErrors: parsed.parseErrors,
      previews: [] as ImportChapterPreview[]
    };
  }

  if (parsed.chapters.length > BULK_IMPORT_MAX_CHAPTERS) {
    return {
      error: `Tối đa ${BULK_IMPORT_MAX_CHAPTERS} chương mỗi lần nhập.`,
      parseErrors: parsed.parseErrors,
      previews: [] as ImportChapterPreview[]
    };
  }

  const supabase = await createClient();
  const existing = await getExistingEpisodeNumbers(supabase, input.storyId);
  const previews = buildImportChapterPreviews(parsed.chapters, existing);

  return {
    error: null,
    parseErrors: parsed.parseErrors,
    previews
  };
}

export async function confirmBulkImportAction(input: {
  storyId: string;
  chapters: Array<{
    chapterNumber: number;
    title: string;
    content: string;
    selected: boolean;
    status: string;
  }>;
}) {
  const actor = await getActor();

  if (!actor.ok) {
    return { error: actor.error, ok: false as const };
  }

  try {
    await assertCreatorOwnsStory(actor.creatorProfile, input.storyId);
  } catch {
    return { error: "Bạn không có quyền với truyện này.", ok: false as const };
  }

  const previews = input.chapters.map((chapter, index) => ({
    chapterNumber: chapter.chapterNumber,
    content: chapter.content,
    id: `confirm-${index}`,
    previewLines: "",
    selected: chapter.selected,
    status: chapter.status as ImportChapterPreview["status"],
    title: chapter.title,
    warnings: [],
    wordCount: 0
  }));

  const validation = validatePreviewForImport(previews);

  if (!validation.ok || !validation.selected) {
    return { error: validation.error, ok: false as const };
  }

  const supabase = await createClient();
  const result = await importChaptersAsDrafts(
    supabase,
    input.storyId,
    validation.selected.map((chapter) => ({
      chapterNumber: chapter.chapterNumber,
      content: chapter.content,
      title: chapter.title
    }))
  );

  if (!result.ok) {
    return { error: result.error ?? "Nhập thất bại. Vui lòng thử lại.", ok: false as const };
  }

  revalidatePath(studioPath(`/stories/${input.storyId}/chapters`));
  revalidatePath(studioPath("/stories"));

  const query = new URLSearchParams({
    imported: String(result.importedCount),
    skipped: String(result.skippedCount)
  });

  redirect(`${studioPath(`/stories/${input.storyId}/chapters`)}?${query.toString()}`);
}
