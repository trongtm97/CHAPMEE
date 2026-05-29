import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { EarlyFanStoryItem } from "@/types/early-fan";
import type { TopFanHighlight } from "@/types/fan";
import type { AuthorThankYouView, ThankYouRecipientGroupType } from "@/types/thank-you";

type ThankYouRow = {
  id: string;
  author_id: string;
  story_id: string | null;
  recipient_user_id: string | null;
  recipient_group_type: ThankYouRecipientGroupType | null;
  message: string;
  created_at: string;
  creator_profiles:
    | {
        pen_name: string | null;
        profiles: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
      }
    | {
        pen_name: string | null;
        profiles: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
      }[]
    | null;
  stories:
    | { title: string | null; slug: string | null }
    | { title: string | null; slug: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function buildRecipientLabel(row: ThankYouRow) {
  if (row.recipient_group_type === "top_fans") return "Top Fan";
  if (row.recipient_group_type === "early_fans") return "Fan đời đầu";
  if (row.recipient_group_type === "commenters") return "Người bình luận";
  if (row.recipient_group_type === "all_readers") return "Tất cả độc giả";
  if (row.recipient_user_id) return "Riêng cho bạn";
  return "Cộng đồng";
}

function mapThankYou(row: ThankYouRow): AuthorThankYouView {
  const author = firstRelation(row.creator_profiles);
  const story = firstRelation(row.stories);
  return {
    id: row.id,
    authorId: row.author_id,
    storyId: row.story_id,
    recipientUserId: row.recipient_user_id,
    recipientGroupType: row.recipient_group_type,
    message: row.message,
    createdAt: row.created_at,
    authorName: author?.pen_name ?? "Tác giả ChapMee",
    authorAvatarUrl: firstRelation(author?.profiles)?.avatar_url ?? null,
    storyTitle: story?.title ?? null,
    recipientLabel: buildRecipientLabel(row),
    shareUrl: `/thank-yous/${row.id}`
  };
}

function isTopFanForStory(topFans: TopFanHighlight[], storyId: string | null) {
  if (!storyId) return topFans.length > 0;
  return topFans.some((item) => item.kind === "story" && item.href?.includes(storyId));
}

export async function getMyThankYous(
  userId: string,
  context?: {
    earlyFanStories?: EarlyFanStoryItem[];
    topFanHighlights?: TopFanHighlight[];
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("author_thank_yous")
    .select("id, author_id, story_id, recipient_user_id, recipient_group_type, message, created_at, creator_profiles(pen_name, profiles(avatar_url)), stories(title, slug)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const earlyFanStoryIds = new Set((context?.earlyFanStories ?? []).map((story) => story.storyId));
  const topFanHighlights = context?.topFanHighlights ?? [];

  return ((data ?? []) as ThankYouRow[])
    .filter((row) => {
      if (row.recipient_user_id && row.recipient_user_id === userId) return true;
      if (row.recipient_group_type === "all_readers") return true;
      if (row.recipient_group_type === "early_fans") {
        return row.story_id ? earlyFanStoryIds.has(row.story_id) : earlyFanStoryIds.size > 0;
      }
      if (row.recipient_group_type === "top_fans") {
        return isTopFanForStory(topFanHighlights, row.story_id);
      }
      if (row.recipient_group_type === "commenters") {
        return Boolean(row.recipient_user_id === userId);
      }
      return false;
    })
    .map((row) => mapThankYou(row));
}

export async function getMySentThankYous(authorUserId: string) {
  const supabase = await createClient();
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", authorUserId)
    .maybeSingle();

  if (!creatorProfile) return [];

  const { data, error } = await supabase
    .from("author_thank_yous")
    .select("id, author_id, story_id, recipient_user_id, recipient_group_type, message, created_at, creator_profiles(pen_name, profiles(avatar_url)), stories(title, slug)")
    .eq("author_id", creatorProfile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return ((data ?? []) as ThankYouRow[]).map((row) => mapThankYou(row));
}

export async function getThankYouById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("author_thank_yous")
    .select("id, author_id, story_id, recipient_user_id, recipient_group_type, message, created_at, creator_profiles(pen_name, profiles(avatar_url)), stories(title, slug)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    return null;
  }
  if (!data) return null;
  return mapThankYou(data as ThankYouRow);
}

export async function createThankYou(input: {
  authorId: string;
  storyId?: string | null;
  recipientUserId?: string | null;
  recipientGroupType?: ThankYouRecipientGroupType | null;
  message: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("author_thank_yous").insert({
    author_id: input.authorId,
    story_id: input.storyId ?? null,
    recipient_user_id: input.recipientUserId ?? null,
    recipient_group_type: input.recipientGroupType ?? null,
    message: input.message
  });
  if (error) throw error;
}
