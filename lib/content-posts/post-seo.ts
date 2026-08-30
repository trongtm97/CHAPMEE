import {
  getContentPostSeoIssues,
  getContentPostSeoScore
} from "@/lib/content-posts/seo-validation";
import type { AdminContentPost } from "@/types/platform-content";

function toSeoCheckInput(item: AdminContentPost) {
  return {
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt ?? "",
    content: item.content ?? "",
    postType: item.post_type,
    coverImageUrl: item.cover_media_asset_id || item.cover_image_url || "",
    seoTitle: item.seo_title ?? "",
    seoDescription: item.seo_description ?? "",
    canonicalUrl: item.canonical_url ?? "",
    indexable: item.indexable
  };
}

export function getContentPostSeoScoreForItem(item: AdminContentPost) {
  return getContentPostSeoScore(toSeoCheckInput(item));
}

export function contentPostHasSeoIssue(item: AdminContentPost) {
  return getContentPostSeoIssues(toSeoCheckInput(item)).length > 0;
}
