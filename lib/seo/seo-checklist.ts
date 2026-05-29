import { isUrlSafeSlug } from "@/lib/seo/slugify-vi";
import {
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  type SEOChecklistItem
} from "@/types/seo";

export function buildStorySEOChecklist(input: {
  hasCover?: boolean;
  hasGenre?: boolean;
  hasTags?: boolean;
  isIndexable?: boolean;
  seoDescription: string;
  seoTitle: string;
  slug?: string;
}) {
  const descriptionLength = input.seoDescription.trim().length;
  const titleLength = input.seoTitle.trim().length;

  const items: SEOChecklistItem[] = [
    {
      id: "seo-title",
      label: "Có tiêu đề SEO",
      passed: titleLength > 0
    },
    {
      id: "seo-title-length",
      label: `Tiêu đề SEO không quá ${SEO_TITLE_MAX_LENGTH} ký tự`,
      passed: titleLength > 0 && titleLength <= SEO_TITLE_MAX_LENGTH
    },
    {
      id: "seo-description",
      label: "Có mô tả SEO",
      passed: descriptionLength > 0
    },
    {
      id: "seo-description-range",
      label: `Mô tả SEO từ ${SEO_DESCRIPTION_MIN_LENGTH}–${SEO_DESCRIPTION_MAX_LENGTH} ký tự`,
      passed:
        descriptionLength >= SEO_DESCRIPTION_MIN_LENGTH &&
        descriptionLength <= SEO_DESCRIPTION_MAX_LENGTH
    },
    {
      id: "cover",
      label: "Có ảnh bìa",
      passed: Boolean(input.hasCover)
    },
    {
      id: "genre",
      label: "Có danh mục (thể loại)",
      passed: Boolean(input.hasGenre)
    },
    {
      id: "tags",
      label: "Có thể loại (tag)",
      passed: Boolean(input.hasTags)
    },
    {
      id: "slug",
      label: "Đường dẫn hợp lệ",
      passed: Boolean(input.slug && isUrlSafeSlug(input.slug))
    },
    {
      id: "indexable",
      label: "Nội dung public mới được index",
      passed: Boolean(input.isIndexable)
    }
  ];

  return items;
}

export function buildChapterSEOChecklist(input: {
  isIndexable?: boolean;
  seoDescription: string;
  seoTitle: string;
}) {
  const descriptionLength = input.seoDescription.trim().length;
  const titleLength = input.seoTitle.trim().length;

  return [
    {
      id: "seo-title",
      label: "Có tiêu đề SEO",
      passed: titleLength > 0
    },
    {
      id: "seo-title-length",
      label: `Tiêu đề SEO không quá ${SEO_TITLE_MAX_LENGTH} ký tự`,
      passed: titleLength > 0 && titleLength <= SEO_TITLE_MAX_LENGTH
    },
    {
      id: "seo-description",
      label: "Có mô tả SEO",
      passed: descriptionLength > 0
    },
    {
      id: "seo-description-range",
      label: `Mô tả SEO từ ${SEO_DESCRIPTION_MIN_LENGTH}–${SEO_DESCRIPTION_MAX_LENGTH} ký tự`,
      passed:
        descriptionLength >= SEO_DESCRIPTION_MIN_LENGTH &&
        descriptionLength <= SEO_DESCRIPTION_MAX_LENGTH
    },
    {
      id: "indexable",
      label: "Chương public mới được index",
      passed: Boolean(input.isIndexable)
    }
  ] satisfies SEOChecklistItem[];
}
