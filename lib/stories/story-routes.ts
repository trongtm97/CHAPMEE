export function getStoryChapterHref(slug: string, episodeNumber: number) {
  return `/stories/${encodeURIComponent(slug)}/episodes/${episodeNumber}`;
}

export function getStoryDetailHref(slug: string) {
  return `/stories/${encodeURIComponent(slug)}`;
}
