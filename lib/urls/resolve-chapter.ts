import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { createClient } from "@/lib/supabase/server";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { parsePublicSegment } from "@/lib/urls/parse";
import { pickPublicRedirectPath } from "@/lib/urls/redirect-canonical";
import {
  getChapterUrl,
  type ChapterUrlFields,
  type StoryUrlFields
} from "@/lib/urls/paths";

export type PublicChapterRecord = ChapterUrlFields & {
  id: string;
  title: string;
  episode_number: number;
  story_id: string;
  canonical_path: string | null;
  status: string;
};

export type PublicChapterWithStory = {
  chapter: PublicChapterRecord;
  story: StoryUrlFields & { id: string; title: string };
  canonicalPath: string;
};

export async function getChapterByPublicCode(
  publicCode: string
): Promise<PublicChapterWithStory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episodes")
    .select(
      "id, title, slug, public_code, episode_number, story_id, canonical_path, status, stories!inner(id, slug, public_code, title, visibility, status, quality_status)"
    )
    .eq("public_code", publicCode)
    .in("status", [...publicContentStatuses])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const storyRow = Array.isArray(data.stories) ? data.stories[0] : data.stories;
  if (
    !storyRow ||
    storyRow.visibility !== "public" ||
    !publicContentStatuses.includes(storyRow.status as (typeof publicContentStatuses)[number]) ||
    storyRow.quality_status === PERMANENTLY_HIDDEN_QUALITY_STATUS
  ) {
    return null;
  }

  const story: StoryUrlFields & { id: string; title: string } = {
    id: storyRow.id,
    title: storyRow.title,
    slug: storyRow.slug,
    public_code: storyRow.public_code
  };

  const chapter: PublicChapterRecord = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    public_code: data.public_code,
    episode_number: data.episode_number,
    story_id: data.story_id,
    canonical_path: data.canonical_path,
    status: data.status
  };

  const canonicalPath = pickPublicRedirectPath(
    chapter.canonical_path,
    getChapterUrl(story, chapter),
    "chapter"
  );

  return { chapter, story, canonicalPath };
}

export async function resolveChapterFromSegments(
  storySegment: string,
  chapterSegment: string
): Promise<PublicChapterWithStory | null> {
  const chapterParsed = parsePublicSegment(chapterSegment, "chapter");
  if (chapterParsed) {
    const resolved = await getChapterByPublicCode(chapterParsed.publicCode);
    if (!resolved) {
      return null;
    }

    const storyParsed = parsePublicSegment(storySegment, "story");
    if (
      storyParsed &&
      storyParsed.publicCode !== resolved.story.public_code
    ) {
      return resolved;
    }

    return resolved;
  }

  const episodeNumber = Number(chapterSegment);
  if (!Number.isFinite(episodeNumber) || episodeNumber <= 0) {
    return null;
  }

  const supabase = await createClient();
  const storyParsed = parsePublicSegment(storySegment, "story");
  let storyQuery = supabase
    .from("stories")
    .select("id, title, slug, public_code, visibility, status, quality_status")
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS);

  if (storyParsed) {
    storyQuery = storyQuery.eq("public_code", storyParsed.publicCode);
  } else {
    storyQuery = storyQuery.eq("slug", storySegment);
  }

  const { data: storyRow } = await storyQuery.maybeSingle();
  if (!storyRow?.public_code) {
    return null;
  }

  const { data: episodeRow } = await supabase
    .from("episodes")
    .select("id, title, slug, public_code, episode_number, story_id, canonical_path, status")
    .eq("story_id", storyRow.id)
    .eq("episode_number", episodeNumber)
    .in("status", [...publicContentStatuses])
    .maybeSingle();

  if (!episodeRow?.public_code || !episodeRow.slug) {
    return null;
  }

  const story = {
    id: storyRow.id,
    title: storyRow.title,
    slug: storyRow.slug,
    public_code: storyRow.public_code
  };

  const chapter: PublicChapterRecord = {
    id: episodeRow.id,
    title: episodeRow.title,
    slug: episodeRow.slug,
    public_code: episodeRow.public_code,
    episode_number: episodeRow.episode_number,
    story_id: episodeRow.story_id,
    canonical_path: episodeRow.canonical_path,
    status: episodeRow.status
  };

  return {
    chapter,
    story,
    canonicalPath: pickPublicRedirectPath(
      episodeRow.canonical_path,
      getChapterUrl(story, chapter),
      "chapter"
    )
  };
}

export async function resolveStoryPublicFieldsBySlug(
  slug: string
): Promise<(StoryUrlFields & { id: string }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("id, slug, public_code")
    .eq("slug", slug)
    .maybeSingle();

  if (!data?.public_code) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    public_code: data.public_code
  };
}
