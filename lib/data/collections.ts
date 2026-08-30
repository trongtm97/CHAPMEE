import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { createClient } from "@/lib/data/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import type {
  CollectionDetail,
  CollectionFormValues,
  CollectionStoryItem,
  CollectionSummary,
  CollectionVisibility
} from "@/types/collection";

type CollectionRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  visibility: CollectionVisibility;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  profiles:
    | { id: string | null; display_name: string | null; username: string | null; avatar_url: string | null }
    | { id: string | null; display_name: string | null; username: string | null; avatar_url: string | null }[]
    | null;
};

type CollectionItemRow = {
  id: string;
  collection_id: string;
  story_id: string;
  sort_order: number;
  note: string | null;
  created_at: string;
  stories: {
    id: string;
    title: string;
    slug: string;
    public_code: string;
    cover_url: string | null;
    hook: string | null;
    creator_profiles: { pen_name: string | null } | { pen_name: string | null }[] | null;
  } | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function toStoryItem(
  row: CollectionItemRow,
  taxonomyByStory: Map<string, { mainGenreName: string | null }>
): CollectionStoryItem {
  const creator = firstRelation(row.stories?.creator_profiles);
  const storyId = row.story_id;

  return {
    id: row.id,
    storyId: row.story_id,
    title: row.stories?.title ?? "Untitled",
    slug: row.stories?.slug ?? "",
    publicCode: row.stories?.public_code ?? "",
    coverUrl: resolveStoryCoverUrl(row.stories?.cover_url ?? null),
    hook: row.stories?.hook ?? null,
    authorName: resolveCreatorRowName(creator),
    genreName: taxonomyByStory.get(storyId)?.mainGenreName ?? null,
    note: row.note,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function toSummary(row: CollectionRow, items: CollectionStoryItem[]): CollectionSummary {
  const previewStories = items.slice(0, 3);

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    coverImageUrl: resolveStoredMediaUrl(row.cover_image_url),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: items.length,
    previewStories
  };
}

export async function getMyCollections(limit = 20): Promise<CollectionSummary[]> {
  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return [];

  const { data, error } = await db
    .from("collections")
    .select("id, user_id, title, description, visibility, cover_image_url, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return Promise.all(
    (data as CollectionRow[]).map(async (row) => {
      const items = await getCollectionItems(row.id, user.id);
      return toSummary(row, items);
    })
  );
}

export async function getCollectionById(id: string): Promise<CollectionDetail | null> {
  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  const { data, error } = await db
    .from("collections")
    .select(
      "id, user_id, title, description, visibility, cover_image_url, created_at, updated_at, profiles(id, display_name, username, avatar_url)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as CollectionRow;
  const isOwner = Boolean(user?.id && user.id === row.user_id);
  if (row.visibility === "private" && !isOwner) return null;

  const items = await getCollectionItems(row.id, user?.id ?? null);
  const profile = firstRelation(row.profiles);

  return {
    ...toSummary(row, items),
    isOwner,
    user: {
      id: profile?.id ?? row.user_id,
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
      avatarUrl: profileAvatarUrlFromRow(profile)
    },
    items
  };
}

export async function getCollectionItems(collectionId: string, userId: string | null): Promise<CollectionStoryItem[]> {
  const db = await createClient();
  const query = db
    .from("collection_items")
    .select(`id, collection_id, story_id, sort_order, note, created_at, stories(id, title, slug, public_code, cover_url, hook, ${CREATOR_PROFILE_STORY_JOIN})`)
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (userId) {
    // query already respects RLS, but keeping signature for future use
    void userId;
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as unknown as CollectionItemRow[];
  const storyIds = rows.map((row) => row.story_id);
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

  return rows.map((row) => toStoryItem(row, taxonomyByStory));
}

export async function getPublicCollections(limit = 20): Promise<CollectionSummary[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("collections")
    .select("id, user_id, title, description, visibility, cover_image_url, created_at, updated_at")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return Promise.all(
    (data as CollectionRow[]).map(async (row) => {
      const items = await getCollectionItems(row.id, null);
      return toSummary(row, items);
    })
  );
}

export async function createCollection(values: CollectionFormValues) {
  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error("Vui lòng đăng nhập để tạo tủ truyện.");

  const { data, error } = await db
    .from("collections")
    .insert({
      user_id: user.id,
      title: values.title,
      description: values.description || null,
      visibility: values.visibility
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Không tạo được collection.");
  return data.id as string;
}

export async function updateCollection(id: string, values: CollectionFormValues) {
  const db = await createClient();
  const { error } = await db
    .from("collections")
    .update({
      title: values.title,
      description: values.description || null,
      visibility: values.visibility,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteCollection(id: string) {
  const db = await createClient();
  const { error } = await db.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addStoryToCollection(collectionId: string, storyId: string, note?: string | null) {
  const db = await createClient();
  const { error } = await db.from("collection_items").upsert(
    {
      collection_id: collectionId,
      story_id: storyId,
      note: note ?? null
    },
    { onConflict: "collection_id,story_id" }
  );
  if (error) throw new Error(error.message);
}

export async function removeStoryFromCollection(collectionId: string, storyId: string) {
  const db = await createClient();
  const { error } = await db
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("story_id", storyId);
  if (error) throw new Error(error.message);
}
