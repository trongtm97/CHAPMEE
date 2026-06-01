import type { TaxonomyType } from "@/types/taxonomy";

const LANDING_PREFIX: Partial<Record<TaxonomyType, string>> = {
  main_genre: "/the-loai",
  subgenre: "/the-loai-phu",
  trope_tag: "/tag",
  editorial_tag: "/tag",
  setting_tag: "/boi-canh",
  reader_experience: "/cam-giac",
  presentation_mode: "/dinh-dang",
  character_tag: "/nhan-vat",
  relationship_tag: "/quan-he",
  narrative_style: "/phong-cach",
  content_warning: "/canh-bao",
  story_status: "/tinh-trang",
  monetization_access: "/goi-truy-cap",
  content_type: "/loai-truyen",
  age_rating: "/do-tuoi"
};

/** URL segment aliases → taxonomy type (for /kham-pha/[type]/[slug]). */
export const TAXONOMY_TYPE_URL_ALIASES: Record<string, TaxonomyType> = {
  the_loai: "main_genre",
  "the-loai": "main_genre",
  main_genre: "main_genre",
  subgenre: "subgenre",
  the_loai_phu: "subgenre",
  "the-loai-phu": "subgenre",
  tag: "trope_tag",
  trope_tag: "trope_tag",
  editorial_tag: "editorial_tag",
  boi_canh: "setting_tag",
  "boi-canh": "setting_tag",
  setting_tag: "setting_tag",
  cam_giac: "reader_experience",
  "cam-giac": "reader_experience",
  reader_experience: "reader_experience",
  dinh_dang: "presentation_mode",
  "dinh-dang": "presentation_mode",
  presentation_mode: "presentation_mode",
  nhan_vat: "character_tag",
  "nhan-vat": "character_tag",
  character_tag: "character_tag",
  quan_he: "relationship_tag",
  "quan-he": "relationship_tag",
  relationship_tag: "relationship_tag",
  phong_cach: "narrative_style",
  "phong-cach": "narrative_style",
  narrative_style: "narrative_style",
  canh_bao: "content_warning",
  "canh-bao": "content_warning",
  content_warning: "content_warning",
  tinh_trang: "story_status",
  "tinh-trang": "story_status",
  story_status: "story_status",
  goi_truy_cap: "monetization_access",
  "goi-truy-cap": "monetization_access",
  monetization_access: "monetization_access",
  loai_truyen: "content_type",
  "loai-truyen": "content_type",
  content_type: "content_type",
  do_tuoi: "age_rating",
  "do-tuoi": "age_rating",
  age_rating: "age_rating"
};

export function resolveTaxonomyTypeFromUrlSegment(segment: string): TaxonomyType | null {
  const key = segment.trim().toLowerCase();
  return TAXONOMY_TYPE_URL_ALIASES[key] ?? null;
}

export function taxonomyExplorePath(type: TaxonomyType, slug: string) {
  return `/kham-pha/${type}/${slug.trim()}`;
}

/** Public-facing URL for a taxonomy term, when applicable. */
export function taxonomyTermPublicUrl(
  type: TaxonomyType,
  slug: string,
  isPublic = true
): string | null {
  if (!isPublic || !slug.trim()) return null;
  const prefix = LANDING_PREFIX[type];
  if (prefix) {
    return `${prefix}/${slug.trim()}`;
  }
  return taxonomyExplorePath(type, slug);
}

export function taxonomyLandingPath(type: TaxonomyType, slug: string) {
  return taxonomyTermPublicUrl(type, slug) ?? null;
}

export function taxonomyTypeFromLandingSegment(
  segment: string
): TaxonomyType | null {
  switch (segment) {
    case "the-loai":
      return "main_genre";
    case "tag":
      return "trope_tag";
    case "boi-canh":
      return "setting_tag";
    case "cam-giac":
      return "reader_experience";
    case "dinh-dang":
      return "presentation_mode";
    default:
      return null;
  }
}
