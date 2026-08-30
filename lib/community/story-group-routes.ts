type StoryGroupLinkFields = {
  slug: string;
  id?: string;
};

/** Canonical story community group URL (slug preferred). */
export function getStoryGroupHref(story: StoryGroupLinkFields): string {
  return `/community/story/${story.slug}`;
}

export function getStoryGroupActivityHref(
  story: StoryGroupLinkFields,
  tab?: "activity" | "discussion" | "chapters" | "audio" | "films"
) {
  const base = getStoryGroupHref(story);
  if (!tab || tab === "activity") {
    return base;
  }
  return `${base}?tab=${tab}`;
}
