import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { createClient } from "@/lib/supabase/server";
import { getStoryUrl } from "@/lib/urls/paths";
import type { ReaderProfileData } from "@/lib/profile/getReaderProfile";
import type { PersonalActivityItem } from "@/types/me-page";
import type { AuthorThankYouView } from "@/types/thank-you";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  stories: { title: string; slug: string; public_code: string } | { title: string; slug: string; public_code: string }[] | null;
};

type FollowRow = {
  id: string;
  creator_id: string | null;
  created_at: string;
  creator_profiles:
    | {
        pen_name: string;
        user_id: string;
        profiles?: { display_name: string | null; username: string | null } | null;
      }
    | {
        pen_name: string;
        user_id: string;
        profiles?: { display_name: string | null; username: string | null } | null;
      }[]
    | null;
};

type BookshelfRow = {
  id: string;
  updated_at: string;
  stories: { title: string; slug: string; public_code: string } | { title: string; slug: string; public_code: string }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function truncate(text: string, max = 80) {
  const normalized = text.trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1)}…`;
}

export async function getPersonalActivity(
  userId: string,
  readerProfile: ReaderProfileData,
  thankYous: AuthorThankYouView[],
  limit = 12
): Promise<PersonalActivityItem[]> {
  const items: PersonalActivityItem[] = [];

  try {
    const supabase = await createClient();
    const [commentsResult, followsResult, savesResult] = await Promise.all([
      supabase
        .from("comments")
        .select("id, content, created_at, stories(title, slug, public_code)")
        .eq("user_id", userId)
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("follows")
        .select(
          "id, creator_id, created_at, creator_profiles(pen_name, user_id, profiles!creator_profiles_user_id_fkey(display_name, username))"
        )
        .eq("follower_id", userId)
        .not("creator_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("bookshelf_items")
        .select("id, updated_at, stories(title, slug, public_code)")
        .eq("user_id", userId)
        .eq("status", "saved")
        .order("updated_at", { ascending: false })
        .limit(5)
    ]);

    for (const row of (commentsResult.data ?? []) as unknown as CommentRow[]) {
      const story = firstRelation(row.stories);
      if (!story) {
        continue;
      }
      items.push({
        id: `comment-${row.id}`,
        type: "comment",
        message: `Bạn đã bình luận trong «${story.title}»`,
        href: getStoryUrl({ slug: story.slug, public_code: story.public_code }),
        createdAt: row.created_at
      });
    }

    for (const row of (followsResult.data ?? []) as unknown as FollowRow[]) {
      const creator = firstRelation(row.creator_profiles);
      if (!creator) {
        continue;
      }
      const profile = firstRelation(creator.profiles);
      const name = resolvePublicDisplayName(profile, creator);
      const username = profile?.username?.trim();
      items.push({
        id: `follow-${row.id}`,
        type: "follow",
        message: `Bạn đã theo dõi tác giả ${name}`,
        href: username ? `/@${username}` : "/discover",
        createdAt: row.created_at
      });
    }

    for (const row of (savesResult.data ?? []) as unknown as BookshelfRow[]) {
      const story = firstRelation(row.stories);
      if (!story) {
        continue;
      }
      items.push({
        id: `save-${row.id}`,
        type: "save",
        message: `Bạn đã lưu truyện «${story.title}»`,
        href: getStoryUrl({ slug: story.slug, public_code: story.public_code }),
        createdAt: row.updated_at
      });
    }
  } catch {
    // Fallback to profile-derived activity below.
  }

  for (const badge of readerProfile.badgeItems.slice(0, 3)) {
    items.push({
      id: `badge-${badge.id}`,
      type: "badge",
      message: `Bạn đã nhận badge «${badge.definition.name}»`,
      href: "/me?tab=achievements",
      createdAt: badge.awardedAt
    });
  }

  for (const milestone of readerProfile.milestones.slice(0, 3)) {
    items.push({
      id: `milestone-${milestone.id}`,
      type: "milestone",
      message: milestone.title,
      href: "/me?tab=achievements",
      createdAt: milestone.achievedAt ?? new Date().toISOString()
    });
  }

  for (const highlight of readerProfile.topFanHighlights.slice(0, 2)) {
    items.push({
      id: `top-fan-${highlight.id}`,
      type: "top_fan",
      message: `Bạn là Top Fan #${highlight.rank} tại «${highlight.title}»`,
      href: highlight.href ?? undefined,
      createdAt: new Date().toISOString()
    });
  }

  for (const thankYou of thankYous.slice(0, 2)) {
    items.push({
      id: `thank-you-${thankYou.id}`,
      type: "thank_you",
      message: `${thankYou.authorName} đã gửi lời cảm ơn: ${truncate(thankYou.message)}`,
      href: thankYou.shareUrl,
      createdAt: thankYou.createdAt
    });
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
