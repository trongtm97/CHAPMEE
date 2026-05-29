import { createClient } from "@/lib/supabase/server";
import type { CollectionStoryItem, CollectionSummary } from "@/types/collection";

const PAGE_SIZE = 20;

type CollectionRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  visibility: "public" | "private";
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
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
    cover_url: string | null;
    hook: string | null;
    genres: { name: string | null } | { name: string | null }[] | null;
    creator_profiles: { pen_name: string | null } | { pen_name: string | null }[] | null;
  } | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function toStoryItem(row: CollectionItemRow): CollectionStoryItem {
  const genre = firstRelation(row.stories?.genres);
  const creator = firstRelation(row.stories?.creator_profiles);

  return {
    id: row.id,
    storyId: row.story_id,
    title: row.stories?.title ?? "Chưa đặt tên",
    slug: row.stories?.slug ?? "",
    coverUrl: row.stories?.cover_url ?? null,
    hook: row.stories?.hook ?? null,
    authorName: creator?.pen_name ?? null,
    genreName: genre?.name ?? null,
    note: row.note,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function toSummary(row: CollectionRow, items: CollectionStoryItem[]): CollectionSummary {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    coverImageUrl: row.cover_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: items.length,
    previewStories: items.slice(0, 3)
  };
}

async function getCollectionItems(collectionId: string): Promise<CollectionStoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select(
      "id, collection_id, story_id, sort_order, note, created_at, stories(id, title, slug, cover_url, hook, genres(name), creator_profiles(pen_name))"
    )
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as unknown as CollectionItemRow[]).map(toStoryItem);
}

export async function getPublicCollectionsForUser(
  userId: string,
  page = 1
): Promise<{ items: CollectionSummary[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { count, error: countError } = await supabase
    .from("collections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("visibility", "public");

  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, user_id, title, description, visibility, cover_image_url, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: countError ? 0 : count ?? 0 };
  }

  const items = await Promise.all(
    (data as CollectionRow[]).map(async (row) => {
      const stories = await getCollectionItems(row.id);
      return toSummary(row, stories);
    })
  );

  return { items, total: count ?? items.length };
}

export async function getPublicCollectionForProfile(
  collectionId: string,
  ownerUsername: string
): Promise<{
  collection: CollectionSummary & { items: CollectionStoryItem[] };
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, user_id, title, description, visibility, cover_image_url, created_at, updated_at, profiles!inner(id, username, display_name, avatar_url)"
    )
    .eq("id", collectionId)
    .eq("visibility", "public")
    .eq("profiles.username", ownerUsername.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as CollectionRow & {
    profiles:
      | { id: string; username: string; display_name: string | null; avatar_url: string | null }
      | { id: string; username: string; display_name: string | null; avatar_url: string | null }[];
  };
  const profile = firstRelation(row.profiles);
  if (!profile?.username) {
    return null;
  }

  const items = await getCollectionItems(collectionId);
  const summary = toSummary(row, items);

  return {
    collection: { ...summary, items },
    owner: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name ?? profile.username,
      avatarUrl: profile.avatar_url
    }
  };
}
