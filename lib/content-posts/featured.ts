import type { AdminContentPost } from "@/types/platform-content";

/** Pin bài lên hub /bai-viet — gắn tag này trong admin (Tags hoặc checkbox). */
export const CONTENT_POST_FEATURED_TAG = "featured";

export function isContentPostFeatured(
  post: Pick<AdminContentPost, "tags">
): boolean {
  return post.tags.some((tag) => tag.trim().toLowerCase() === CONTENT_POST_FEATURED_TAG);
}

export function mergeTagsWithFeatured(tagsInput: string, featured: boolean): string[] {
  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.toLowerCase() !== CONTENT_POST_FEATURED_TAG);
  if (featured) {
    tags.unshift(CONTENT_POST_FEATURED_TAG);
  }
  return tags;
}

export function parseFeaturedFromTags(tagsInput: string): boolean {
  return tagsInput
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .includes(CONTENT_POST_FEATURED_TAG);
}
