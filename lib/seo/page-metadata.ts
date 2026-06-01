/**
 * Unified entry for public page metadata builders.
 * Prefer these over ad-hoc title/description in route files.
 */

export {
  buildGenreMetadata,
  buildPublicAnnouncementMetadata,
  buildPublicContentPostMetadata,
  buildPublicEpisodeMetadata,
  buildPublicPolicyMetadata,
  buildPublicStoryMetadata
} from "@/lib/seo/build-metadata";

export {
  buildTaxonomyLandingPageMetadata,
  buildTaxonomyNotFoundMetadata,
  getTaxonomyH1,
  getTaxonomyIntro,
  getTaxonomySeoDescription,
  getTaxonomySeoTitle
} from "@/lib/seo/taxonomy-seo";

export {
  getAnnouncementUrl,
  getCanonicalUrl,
  getChapterUrl,
  getContentPostUrl,
  getPolicyUrl,
  getProfileUrl,
  getReelUrl,
  getStoryUrl,
  getTaxonomyUrl,
  getTaxonomyUrlByType
} from "@/lib/seo/canonical";
