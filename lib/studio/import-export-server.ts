import { revalidatePath } from "next/cache";
import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { countWords } from "@/lib/text/countWords";
import { resolveStoryDisplayStatus } from "@/lib/studio/status-labels";
import { studioPath } from "@/lib/studio/constants";
import { slugifyVietnamese } from "@/lib/seo/slugify-vi";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import {
  applyMainGenreTermToStory,
  getMainGenreSlugsByStoryIds,
  getStoryIdsForMainGenreTermId,
  loadMainGenreOptionsForImportExport,
  resolveMainGenreTermFromImportValue
} from "@/lib/taxonomy/import-export-bridge";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { StudioDisplayStatus } from "@/types/studio";
import type {
  ExportScopeInput,
  ImportExecutionResult,
  ImportExportDataType,
  ImportExportPageData,
  ImportExportRow,
  StoryQuickPickItem
} from "@/types/studio-import";
import { IMPORT_EXPORT_HEADERS } from "@/types/studio-import";
import type { ImportExportAction } from "@/types/studio-import";

const QUICK_PICK_LIMIT = 10;

function emptyRow(): ImportExportRow {
  return Object.fromEntries(IMPORT_EXPORT_HEADERS.map((header) => [header, ""])) as ImportExportRow;
}

function storyDisplayStatus(
  status: string,
  visibility: string,
  isCompleted: boolean
): StudioDisplayStatus {
  return resolveStoryDisplayStatus({
    isCompleted,
    status: status as Parameters<typeof resolveStoryDisplayStatus>[0]["status"],
    visibility: visibility as "public" | "private"
  });
}

export async function getImportExportPageData(
  creatorProfile: CreatorProfile
): Promise<ImportExportPageData> {
  const supabase = await createClient();

  const [storiesResult, genreOptionsResult, totalResult] = await Promise.all([
    supabase
      .from("stories")
      .select("id, title, status, visibility, is_completed, updated_at, structure_type")
      .eq("creator_id", creatorProfile.id)
      .order("updated_at", { ascending: false })
      .limit(QUICK_PICK_LIMIT),
    loadMainGenreOptionsForImportExport(),
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorProfile.id)
  ]);

  const storyIds = (storiesResult.data ?? []).map((row) => row.id as string);
  const episodeCounts = new Map<string, number>();

  if (storyIds.length > 0) {
    const { data: episodes } = await supabase
      .from("episodes")
      .select("story_id")
      .in("story_id", storyIds);

    for (const episode of episodes ?? []) {
      const storyId = String((episode as { story_id: string }).story_id);
      episodeCounts.set(storyId, (episodeCounts.get(storyId) ?? 0) + 1);
    }
  }

  const stories: StoryQuickPickItem[] = (storiesResult.data ?? []).map((row) => ({
    displayStatus: storyDisplayStatus(
      String(row.status),
      String(row.visibility),
      Boolean(row.is_completed)
    ),
    episodeCount: episodeCounts.get(String(row.id)) ?? 0,
    id: String(row.id),
    structureType: normalizeStoryStructureType(
      (row as { structure_type?: string }).structure_type
    ),
    title: String(row.title)
  }));

  return {
    genres: genreOptionsResult.options.map((genre) => ({
      id: genre.id,
      name: genre.name
    })),
    hasExportableData: (totalResult.count ?? 0) > 0,
    performerName: creatorProfile.display_name ?? "Creator",
    stories,
    totalStories: totalResult.count ?? 0
  };
}

export async function getExportScopedStoryIds(
  creatorProfile: CreatorProfile,
  scope: ExportScopeInput
): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase.from("stories").select("id, status, visibility, is_completed, updated_at").eq(
    "creator_id",
    creatorProfile.id
  );

  if (scope.mode === "selected_stories" && scope.storyIds?.length) {
    query = query.in("id", scope.storyIds);
  }

  if (scope.mode === "by_genre" && scope.genreId) {
    const taxonomyStoryIds = await getStoryIdsForMainGenreTermId(
      supabase,
      scope.genreId,
      creatorProfile.id
    );
    if (taxonomyStoryIds.length === 0) {
      return [];
    }
    query = query.in("id", taxonomyStoryIds);
  }

  if (scope.mode === "by_updated") {
    if (scope.updatedAfter) {
      query = query.gte("updated_at", scope.updatedAfter);
    }
    if (scope.updatedBefore) {
      query = query.lte("updated_at", scope.updatedBefore);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let rows = data ?? [];

  if (scope.mode === "by_status" && scope.status && scope.status !== "all") {
    rows = rows.filter((row) => {
      const display = storyDisplayStatus(
        String(row.status),
        String(row.visibility),
        Boolean(row.is_completed)
      );
      return display === scope.status;
    });
  }

  return rows.map((row) => String(row.id));
}

export async function fetchExportRowsAction(input: {
  dataType: ImportExportDataType;
  scope: ExportScopeInput;
}): Promise<{ rows: ImportExportRow[]; error?: string }> {
  const creatorState = await getCurrentCreatorProfile();

  if (!creatorState.creatorProfile) {
    return { error: "Bạn cần đăng nhập Studio.", rows: [] };
  }

  try {
    const storyIds = await getExportScopedStoryIds(creatorState.creatorProfile, input.scope);

    if (storyIds.length === 0) {
      return { error: "Không có dữ liệu phù hợp để xuất.", rows: [] };
    }

    const supabase = await createClient();
    const rows: ImportExportRow[] = [];
    const { dataType } = input;

    if (dataType === "stories" || dataType === "stories_chapters" || dataType === "all") {
      const { data: stories, error } = await supabase
        .from("stories")
        .select("id, title, status, visibility, is_completed")
        .eq("creator_id", creatorState.creatorProfile.id)
        .in("id", storyIds);

      if (error) {
        throw new Error(error.message);
      }

      const exportStoryIds = (stories ?? []).map((story) => String(story.id));
      const genreSlugsByStory = await getMainGenreSlugsByStoryIds(supabase, exportStoryIds);

      for (const story of stories ?? []) {
        const row = emptyRow();
        row.story_id = String(story.id);
        row.story_title = String(story.title);
        row.story_status = storyDisplayStatus(
          String(story.status),
          String(story.visibility),
          Boolean(story.is_completed)
        );
        row.story_genre = genreSlugsByStory.get(String(story.id)) ?? "";
        row.action = "update";
        rows.push(row);
      }
    }

    if (dataType === "chapters" || dataType === "stories_chapters" || dataType === "all") {
      const { data: episodes, error } = await supabase
        .from("episodes")
        .select(
          "id, story_id, episode_number, title, content, status, stories!inner(id, title, creator_id, status, visibility, is_completed)"
        )
        .in("story_id", storyIds)
        .eq("stories.creator_id", creatorState.creatorProfile.id)
        .order("episode_number", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const episodeStoryIds = [
        ...new Set((episodes ?? []).map((episode) => String(episode.story_id)))
      ];
      const genreSlugsByStory = await getMainGenreSlugsByStoryIds(supabase, episodeStoryIds);

      for (const episode of episodes ?? []) {
        const story = Array.isArray(episode.stories) ? episode.stories[0] : episode.stories;

        const row = emptyRow();
        row.story_id = String(episode.story_id);
        row.story_title = story?.title ? String(story.title) : "";
        row.story_status = story
          ? storyDisplayStatus(String(story.status), String(story.visibility), Boolean(story.is_completed))
          : "";
        row.story_genre = genreSlugsByStory.get(String(episode.story_id)) ?? "";
        row.chapter_id = String(episode.id);
        row.chapter_number = String(episode.episode_number);
        row.chapter_title = String(episode.title);
        row.chapter_status = String(episode.status);
        row.chapter_content = String(episode.content ?? "");
        row.action = "update";
        rows.push(row);
      }
    }

    if (dataType === "reels" || dataType === "all") {
      const { data: reels, error } = await supabase
        .from("reels_items")
        .select(
          "id, story_id, title, hook, body, status, scheduled_at, stories!inner(id, title, creator_id)"
        )
        .eq("owner_id", creatorState.creatorProfile.user_id)
        .in("story_id", storyIds);

      if (error) {
        throw new Error(error.message);
      }

      for (const reel of reels ?? []) {
        const story = Array.isArray(reel.stories) ? reel.stories[0] : reel.stories;
        const row = emptyRow();
        row.story_id = String(reel.story_id);
        row.story_title = story?.title ? String(story.title) : "";
        row.reel_id = String(reel.id);
        row.reel_title = reel.title ? String(reel.title) : String(reel.hook ?? "");
        row.reel_text = String(reel.body ?? "");
        row.reel_status = String(reel.status);
        row.scheduled_at = reel.scheduled_at ? String(reel.scheduled_at) : "";
        row.action = "update";
        rows.push(row);
      }
    }

    if (dataType === "chapters") {
      return { rows: rows.filter((row) => Boolean(row.chapter_id)) };
    }

    if (dataType === "reels") {
      return { rows: rows.filter((row) => Boolean(row.reel_id)) };
    }

    if (dataType === "stories") {
      return { rows: rows.filter((row) => Boolean(row.story_id) && !row.chapter_id && !row.reel_id) };
    }

    return { rows };
  } catch (caught) {
    return {
      error: caught instanceof Error ? caught.message : "Không thể xuất dữ liệu.",
      rows: []
    };
  }
}

async function resolveStoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorId: string,
  row: ImportExportRow
): Promise<string | null> {
  if (row.story_id) {
    const { data } = await supabase
      .from("stories")
      .select("id")
      .eq("id", row.story_id)
      .eq("creator_id", creatorId)
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  if (row.story_title) {
    const { data } = await supabase
      .from("stories")
      .select("id")
      .eq("creator_id", creatorId)
      .ilike("title", row.story_title.trim())
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  return null;
}

async function resolveChapterId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string,
  row: ImportExportRow
): Promise<string | null> {
  if (row.chapter_id) {
    const { data } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", row.chapter_id)
      .eq("story_id", storyId)
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  if (row.chapter_number) {
    const { data } = await supabase
      .from("episodes")
      .select("id")
      .eq("story_id", storyId)
      .eq("episode_number", Number.parseInt(row.chapter_number, 10))
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  return null;
}

async function resolveMainGenreForImport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  genreValue: string
): Promise<string | null> {
  if (!genreValue.trim()) {
    return null;
  }
  return resolveMainGenreTermFromImportValue(supabase, genreValue);
}

function mapDisplayStatusToDb(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "published" || normalized === "completed") {
    return "published";
  }
  if (normalized === "scheduled" || normalized === "under_review") {
    return "pending";
  }
  if (normalized === "hidden") {
    return "archived";
  }
  if (normalized === "rejected") {
    return "rejected";
  }
  return "draft";
}

async function processImportRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorProfile: CreatorProfile,
  row: ImportExportRow,
  action: ImportExportAction,
  rowIndex: number
): Promise<{ ok: boolean; kind?: "created" | "updated" | "hidden" | "deleted" | "skipped"; message?: string }> {
  const storyId = await resolveStoryId(supabase, creatorProfile.id, row);

  if ((action === "update" || action === "hide" || action === "delete" || action === "schedule") && row.story_id && !storyId) {
    return { kind: "skipped", message: "Truyện không thuộc tài khoản của bạn.", ok: false };
  }

  if (action === "create" && row.story_title && !row.chapter_id && !row.reel_id && !row.chapter_number) {
    const mainGenreTermId = row.story_genre
      ? await resolveMainGenreForImport(supabase, row.story_genre)
      : null;
    if (row.story_genre && !mainGenreTermId) {
      return {
        kind: "skipped",
        message: `story_genre "${row.story_genre}" không tồn tại — dùng slug từ taxonomy_reference.`,
        ok: false
      };
    }
    const baseSlug = slugifyVietnamese(row.story_title.trim()) || "truyen-moi";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const { data: inserted, error } = await supabase
      .from("stories")
      .insert({
        creator_id: creatorProfile.id,
        slug,
        status: mapDisplayStatusToDb(row.story_status || "draft"),
        title: row.story_title.trim(),
        visibility: "private"
      })
      .select("id")
      .single();

    if (error) {
      return { kind: "skipped", message: error.message, ok: false };
    }

    if (mainGenreTermId && inserted?.id) {
      const applied = await applyMainGenreTermToStory(
        supabase,
        String(inserted.id),
        mainGenreTermId
      );
      if (!applied.ok) {
        return { kind: "skipped", message: applied.error ?? "Không gán được thể loại.", ok: false };
      }
    }

    return { kind: "created", ok: true };
  }

  if (action === "update" && row.story_id && storyId && !row.chapter_id && !row.reel_id) {
    const patch: Record<string, unknown> = {};
    if (row.story_title) {
      patch.title = row.story_title.trim();
    }
    if (row.story_status) {
      patch.status = mapDisplayStatusToDb(row.story_status);
    }
    let taxonomyUpdated = false;
    if (row.story_genre) {
      const termId = await resolveMainGenreForImport(supabase, row.story_genre);
      if (!termId) {
        return {
          kind: "skipped",
          message: `story_genre "${row.story_genre}" không tồn tại — dùng slug từ taxonomy_reference.`,
          ok: false
        };
      }
      const applied = await applyMainGenreTermToStory(supabase, storyId, termId);
      if (!applied.ok) {
        return { kind: "skipped", message: applied.error ?? "Không cập nhật được thể loại.", ok: false };
      }
      taxonomyUpdated = true;
    }

    if (Object.keys(patch).length === 0) {
      if (taxonomyUpdated) {
        return { kind: "updated", ok: true };
      }
      return { kind: "skipped", message: "Không có trường truyện để cập nhật.", ok: false };
    }

    const { error } = await supabase.from("stories").update(patch).eq("id", storyId);
    return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "updated", ok: true };
  }

  if (row.chapter_title || row.chapter_content || row.chapter_id || row.chapter_number) {
    const resolvedStoryId = storyId ?? (row.story_id ? null : null);

    if (!resolvedStoryId) {
      return { kind: "skipped", message: "Không tìm thấy truyện cho chương.", ok: false };
    }

    try {
      await assertCreatorOwnsStory(creatorProfile, resolvedStoryId);
    } catch {
      return { kind: "skipped", message: "Bạn không có quyền với truyện này.", ok: false };
    }

    const chapterId = await resolveChapterId(supabase, resolvedStoryId, row);

    if (action === "create" && !chapterId) {
      const content = sanitizePlainContent(row.chapter_content || "");
      const title = row.chapter_title.trim() || `Chương ${row.chapter_number || "?"}`;
      const episodeNumber = row.chapter_number
        ? Number.parseInt(row.chapter_number, 10)
        : undefined;

      if (!episodeNumber || episodeNumber < 1) {
        return { kind: "skipped", message: "chapter_number không hợp lệ.", ok: false };
      }

      const { error } = await supabase.from("episodes").insert({
        content,
        episode_number: episodeNumber,
        excerpt: createExcerpt(content, 40, 80),
        status: mapDisplayStatusToDb(row.chapter_status || "draft"),
        story_id: resolvedStoryId,
        title,
        word_count: countWords(content)
      });

      return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "created", ok: true };
    }

    if ((action === "update" || action === "schedule") && chapterId) {
      const patch: Record<string, unknown> = {};
      if (row.chapter_title) {
        patch.title = row.chapter_title.trim();
      }
      if (row.chapter_content) {
        const content = sanitizePlainContent(row.chapter_content);
        patch.content = content;
        patch.excerpt = createExcerpt(content, 40, 80);
        patch.word_count = countWords(content);
      }
      if (row.chapter_status) {
        patch.status = mapDisplayStatusToDb(row.chapter_status);
      }

      if (Object.keys(patch).length === 0 && action !== "schedule") {
        return { kind: "skipped", message: "Không có trường chương để cập nhật.", ok: false };
      }

      const { error } = await supabase.from("episodes").update(patch).eq("id", chapterId);

      if (error) {
        return { kind: "skipped", message: error.message, ok: false };
      }

      if (action === "schedule" && row.scheduled_at) {
        await supabase.from("scheduled_publications").insert({
          creator_id: creatorProfile.user_id,
          scheduled_at: row.scheduled_at,
          status: "scheduled",
          story_id: resolvedStoryId,
          target_id: chapterId,
          target_type: "chapter",
          timezone: "Asia/Ho_Chi_Minh"
        });
      }

      return { kind: "updated", ok: true };
    }

    if (action === "hide" && chapterId) {
      const { error } = await supabase.from("episodes").update({ status: "archived" }).eq("id", chapterId);
      return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "hidden", ok: true };
    }

    if (action === "delete" && chapterId) {
      const { data: episode } = await supabase
        .from("episodes")
        .select("status")
        .eq("id", chapterId)
        .maybeSingle();

      if (episode?.status !== "draft") {
        return { kind: "skipped", message: "Chỉ xóa được chương nháp.", ok: false };
      }

      const { error } = await supabase.from("episodes").delete().eq("id", chapterId);
      return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "deleted", ok: true };
    }
  }

  if (row.reel_id || row.reel_title || row.reel_text) {
    if (action === "hide" && row.reel_id) {
      const { data } = await supabase
        .from("reels_items")
        .select("id")
        .eq("id", row.reel_id)
        .eq("owner_id", creatorProfile.user_id)
        .maybeSingle();

      if (!data) {
        return { kind: "skipped", message: "Reels không thuộc tài khoản của bạn.", ok: false };
      }

      const { error } = await supabase.from("reels_items").update({ status: "hidden" }).eq("id", row.reel_id);
      return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "hidden", ok: true };
    }

    if (action === "delete" && row.reel_id) {
      const { data } = await supabase
        .from("reels_items")
        .select("id, status")
        .eq("id", row.reel_id)
        .eq("owner_id", creatorProfile.user_id)
        .maybeSingle();

      if (!data) {
        return { kind: "skipped", message: "Reels không thuộc tài khoản của bạn.", ok: false };
      }

      if (data.status !== "draft") {
        return { kind: "skipped", message: "Chỉ xóa được Reels nháp.", ok: false };
      }

      const { error } = await supabase.from("reels_items").delete().eq("id", row.reel_id);
      return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "deleted", ok: true };
    }
  }

  if (action === "hide" && storyId && row.story_id) {
    const { error } = await supabase
      .from("stories")
      .update({ status: "archived", visibility: "private" })
      .eq("id", storyId);
    return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "hidden", ok: true };
  }

  if (action === "delete" && storyId && row.story_id) {
    const { data: story } = await supabase.from("stories").select("status").eq("id", storyId).maybeSingle();
    if (story?.status !== "draft") {
      return { kind: "skipped", message: "Chỉ xóa được truyện nháp.", ok: false };
    }
    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    return error ? { kind: "skipped", message: error.message, ok: false } : { kind: "deleted", ok: true };
  }

  return { kind: "skipped", message: `Dòng ${rowIndex}: không xử lý được hành động ${action}.`, ok: false };
}

export async function executeImportAction(input: {
  rows: ImportExportRow[];
  actions: ImportExportAction[];
  rowIndices: number[];
}): Promise<ImportExecutionResult> {
  const creatorState = await getCurrentCreatorProfile();

  if (!creatorState.creatorProfile) {
    return {
      created: 0,
      deleted: 0,
      errors: [],
      hidden: 0,
      ok: false,
      skipped: 0,
      updated: 0,
      error: "Bạn cần đăng nhập Studio."
    };
  }

  const supabase = await createClient();
  const result: ImportExecutionResult = {
    created: 0,
    deleted: 0,
    errors: [],
    hidden: 0,
    ok: true,
    skipped: 0,
    updated: 0
  };

  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    const action = input.actions[index] ?? "create";
    const rowIndex = input.rowIndices[index] ?? index + 2;

    const processed = await processImportRow(
      supabase,
      creatorState.creatorProfile,
      row,
      action,
      rowIndex
    );

    if (processed.ok) {
      if (processed.kind === "created") {
        result.created += 1;
      } else if (processed.kind === "updated") {
        result.updated += 1;
      } else if (processed.kind === "hidden") {
        result.hidden += 1;
      } else if (processed.kind === "deleted") {
        result.deleted += 1;
      }
    } else {
      result.skipped += 1;
      result.errors.push({
        message: processed.message ?? "Lỗi không xác định.",
        row,
        rowIndex
      });
    }
  }

  if (result.created + result.updated + result.hidden + result.deleted === 0) {
    result.ok = false;
    result.error = "Không nhập được dòng nào. Vui lòng kiểm tra lại file.";
  }

  revalidatePath(studioPath("/import"));
  revalidatePath(studioPath("/stories"));

  return result;
}

export async function searchStoriesForQuickPickAction(input: {
  search?: string;
  page?: number;
}): Promise<{ stories: StoryQuickPickItem[]; total: number }> {
  const creatorState = await getCurrentCreatorProfile();

  if (!creatorState.creatorProfile) {
    return { stories: [], total: 0 };
  }

  const supabase = await createClient();
  const page = input.page ?? 1;
  const from = (page - 1) * QUICK_PICK_LIMIT;
  const to = from + QUICK_PICK_LIMIT - 1;

  let query = supabase
    .from("stories")
    .select("id, title, status, visibility, is_completed, structure_type", { count: "exact" })
    .eq("creator_id", creatorState.creatorProfile.id)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (input.search?.trim()) {
    query = query.ilike("title", `%${input.search.trim()}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    return { stories: [], total: 0 };
  }

  const storyIds = (data ?? []).map((row) => row.id as string);
  const episodeCounts = new Map<string, number>();

  if (storyIds.length > 0) {
    const { data: episodes } = await supabase.from("episodes").select("story_id").in("story_id", storyIds);
    for (const episode of episodes ?? []) {
      const storyId = String((episode as { story_id: string }).story_id);
      episodeCounts.set(storyId, (episodeCounts.get(storyId) ?? 0) + 1);
    }
  }

  return {
    stories: (data ?? []).map((row) => ({
      displayStatus: storyDisplayStatus(String(row.status), String(row.visibility), Boolean(row.is_completed)),
      episodeCount: episodeCounts.get(String(row.id)) ?? 0,
      id: String(row.id),
      structureType: normalizeStoryStructureType(
        (row as { structure_type?: string }).structure_type
      ),
      title: String(row.title)
    })),
    total: count ?? 0
  };
}
