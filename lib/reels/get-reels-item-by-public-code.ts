import { createClient } from "@/lib/supabase/server";
import { pickMainGenreFromLabels, loadMainGenreLabelsByStoryIds } from "@/lib/taxonomy/story-genre-labels";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { getReelsBackgroundSrc } from "@/lib/images/get-story-image";
import {
  resolveReelsCtaLabel,
  resolveReelsReadHref
} from "@/lib/reels/resolve-reels-cta";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { getReelUrl, getStoryUrl } from "@/lib/urls/paths";
import { isValidNumericPublicCode } from "@/lib/urls/public-code";

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function buildReelsExcerpt(excerpt: string | null, content: string | null) {
  const normalizedExcerpt = excerpt?.replace(/\s+/g, " ").trim() ?? "";
  if (normalizedExcerpt) {
    return createExcerpt(normalizedExcerpt, 80, 160);
  }
  if (content) {
    return createExcerpt(content, 80, 160);
  }
  return "Một đoạn truyện ngắn đang chờ bạn mở tiếp.";
}

export async function getReelsItemByPublicCode(
  publicCode: string
): Promise<ReelsItem | null> {
  if (!isValidNumericPublicCode(publicCode)) {
    return null;
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("reels_items")
    .select(
      "id, slug, public_code, hook, body, cta, cta_type, background_image_url, published_at, stories!inner(id, creator_id, title, slug, public_code, hook, cover_url, status, visibility, creator_profiles(id, user_id, pen_name, profiles(username, avatar_url))), episodes(episode_number, title, slug, public_code)"
    )
    .eq("public_code", publicCode)
    .eq("status", "published")
    .maybeSingle();

  if (!row) {
    return null;
  }

  const story = firstRelation(
    (row as { stories: unknown }).stories as
      | {
          id: string;
          creator_id: string | null;
          title: string;
          slug: string;
          public_code: string;
          hook: string | null;
          cover_url: string | null;
          creator_profiles:
            | {
                id: string | null;
                user_id: string | null;
                pen_name: string | null;
                profiles:
                  | { username: string | null; avatar_url: string | null }
                  | { username: string | null; avatar_url: string | null }[]
                  | null;
              }
            | {
                id: string | null;
                user_id: string | null;
                pen_name: string | null;
                profiles:
                  | { username: string | null; avatar_url: string | null }
                  | { username: string | null; avatar_url: string | null }[]
                  | null;
              }[]
            | null;
        }
      | {
          id: string;
          creator_id: string | null;
          title: string;
          slug: string;
          public_code: string;
          hook: string | null;
          cover_url: string | null;
          creator_profiles:
            | {
                id: string | null;
                user_id: string | null;
                pen_name: string | null;
                profiles:
                  | { username: string | null; avatar_url: string | null }
                  | { username: string | null; avatar_url: string | null }[]
                  | null;
              }
            | {
                id: string | null;
                user_id: string | null;
                pen_name: string | null;
                profiles:
                  | { username: string | null; avatar_url: string | null }
                  | { username: string | null; avatar_url: string | null }[]
                  | null;
              }[]
            | null;
        }[]
      | null
  );

  if (!story) {
    return null;
  }

  const episode = firstRelation(
    (row as { episodes: unknown }).episodes as
      | { episode_number: number; title: string; slug: string; public_code: string }
      | { episode_number: number; title: string; slug: string; public_code: string }[]
      | null
  );
  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(supabase, [story.id]);
  const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
  const creator = firstRelation(story.creator_profiles);
  const profile = firstRelation(creator?.profiles);
  const episodeNumber = episode?.episode_number ?? 0;
  const readMoreHref = resolveReelsReadHref({
    storySlug: story.slug,
    storyPublicCode: story.public_code,
    episodeSlug: episode?.slug ?? null,
    episodePublicCode: episode?.public_code ?? null,
    episodeNumber: episodeNumber > 0 ? episodeNumber : null
  });
  const reelRow = row as {
    id: string;
    slug: string;
    public_code: string;
    hook: string;
    body: string;
    cta: string | null;
    cta_type: string | null;
    background_image_url: string | null;
    published_at: string | null;
  };

  return {
    kind: "manual",
    id: reelRow.id,
    backgroundImageUrl:
      reelRow.background_image_url ??
      getReelsBackgroundSrc({
        title: story.title,
        storyCoverUrl: story.cover_url,
        episodeBackgroundUrl: null
      }),
    storyId: story.id,
    episodeNumber,
    episodeTitle: episode?.title ?? "",
    excerpt: reelRow.body,
    hookTitle: reelRow.hook,
    storyTitle: story.title,
    storySlug: story.slug,
    storyPublicCode: story.public_code,
    storyHref: getStoryUrl({ slug: story.slug, public_code: story.public_code }),
    reelPublicCode: reelRow.public_code,
    reelSlug: reelRow.slug,
    reelHref: getReelUrl({ slug: reelRow.slug, public_code: reelRow.public_code }),
    ctaLabel: resolveReelsCtaLabel(reelRow.cta, reelRow.cta_type),
    readMoreHref,
    creatorId: creator?.id ?? story.creator_id ?? null,
    creatorUserId: creator?.user_id ?? null,
    creatorName: resolveCreatorRowName(creator),
    creatorHandle: profile?.username ?? null,
    creatorAvatarUrl: profile?.avatar_url ?? null,
    genreName: picked.genreName,
    publishedAt: reelRow.published_at,
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    shareCount: 0,
    isLiked: false,
    isSaved: false,
    isFollowingCreator: false,
    creatorVerification: null
  };
}
