import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { createClient } from "@/lib/supabase/server";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { parsePublicSegment } from "@/lib/urls/parse";
import { pickPublicRedirectPath } from "@/lib/urls/redirect-canonical";
import { getStoryUrl } from "@/lib/urls/paths";
import type { StoryUrlFields } from "@/lib/urls/paths";

export type PublicStoryRecord = StoryUrlFields & {
  id: string;
  title: string;
  status: string;
  visibility: string;
  canonical_url: string | null;
};

export async function getStoryByPublicCode(
  publicCode: string
): Promise<PublicStoryRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, slug, public_code, status, visibility, canonical_url")
    .eq("public_code", publicCode)
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    public_code: data.public_code,
    status: data.status,
    visibility: data.visibility,
    canonical_url: data.canonical_url
  };
}

export async function resolveStoryFromSegment(segment: string): Promise<{
  story: PublicStoryRecord | null;
  canonicalPath: string | null;
}> {
  const parsed = parsePublicSegment(segment, "story");
  if (parsed) {
    const story = await getStoryByPublicCode(parsed.publicCode);
    if (!story) {
      return { story: null, canonicalPath: null };
    }
    const canonicalPath = pickPublicRedirectPath(
      story.canonical_url,
      getStoryUrl(story),
      "story"
    );
    return { story, canonicalPath };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("id, title, slug, public_code, status, visibility, canonical_url")
    .eq("slug", segment)
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .maybeSingle();

  if (!data?.public_code) {
    return { story: null, canonicalPath: null };
  }

  const story: PublicStoryRecord = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    public_code: data.public_code,
    status: data.status,
    visibility: data.visibility,
    canonical_url: data.canonical_url
  };

  return {
    story,
    canonicalPath: pickPublicRedirectPath(
      data.canonical_url,
      getStoryUrl(story),
      "story"
    )
  };
}
