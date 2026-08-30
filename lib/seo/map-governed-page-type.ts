import type { SeoPageType } from "@/lib/seo/seo-constants";

/** Map platform / legacy pageType strings to SEO Center page types. */
export function mapGovernedPageType(pageType?: string | null): SeoPageType {
  switch (pageType?.trim()) {
    case "policy_page":
    case "policy":
      return "policy";
    case "announcement":
      return "announcement";
    case "article":
    case "content_post":
      return "content_post";
    case "community":
      return "community";
    case "discover":
      return "discover";
    case "story_catalog":
      return "story_catalog";
    case "ranking":
      return "ranking";
    case "reels":
      return "reels";
    case "page":
    case "static":
    default:
      return "static";
  }
}
