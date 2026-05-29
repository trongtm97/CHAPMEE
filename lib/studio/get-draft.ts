import { createClient } from "@/lib/supabase/server";
import type { StudioDraftRecord, StudioDraftType } from "@/types/drafts";

type DraftRow = {
  id: string;
  owner_id: string;
  story_id: string | null;
  chapter_id: string | null;
  draft_type: StudioDraftType;
  title: string | null;
  content: Record<string, unknown>;
  plain_text: string | null;
  status: "draft" | "archived";
  last_saved_at: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DraftRow): StudioDraftRecord {
  return {
    chapterId: row.chapter_id,
    content: row.content ?? {},
    createdAt: row.created_at,
    draftType: row.draft_type,
    id: row.id,
    lastSavedAt: row.last_saved_at,
    ownerId: row.owner_id,
    plainText: row.plain_text,
    status: row.status,
    storyId: row.story_id,
    title: row.title,
    updatedAt: row.updated_at
  };
}

export async function getStudioDraftForEditor(
  profileId: string,
  draftType: StudioDraftType,
  storyId?: string | null,
  chapterId?: string | null
): Promise<StudioDraftRecord | null> {
  const supabase = await createClient();

  let query = supabase
    .from("creator_drafts")
    .select(
      "id, owner_id, story_id, chapter_id, draft_type, title, content, plain_text, status, last_saved_at, created_at, updated_at"
    )
    .eq("owner_id", profileId)
    .eq("draft_type", draftType)
    .eq("status", "draft");

  query = storyId ? query.eq("story_id", storyId) : query.is("story_id", null);
  query = chapterId
    ? query.eq("chapter_id", chapterId)
    : query.is("chapter_id", null);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as DraftRow);
}
