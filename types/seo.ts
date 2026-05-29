export const SEO_TITLE_MAX_LENGTH = 60;
export const SEO_DESCRIPTION_MIN_LENGTH = 80;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;
export const SEO_KEYWORD_MAX_COUNT = 10;
export const SEO_KEYWORD_MAX_LENGTH = 30;
export const SEO_SLUG_MAX_LENGTH = 80;

export type GeneratedStorySEO = {
  description: string;
  keywords: string[];
  slugSuggestion: string;
  title: string;
};

export type GeneratedChapterSEO = {
  description: string;
  keywords: string[];
  title: string;
};

export type StorySEOInput = {
  authorName?: string | null;
  canonicalUrl?: string | null;
  genreName?: string | null;
  hasCover?: boolean;
  hasGenre?: boolean;
  hasTags?: boolean;
  hook?: string | null;
  isIndexable?: boolean;
  longDescription?: string | null;
  shortDescription?: string | null;
  slug?: string | null;
  tagNames?: string[];
  title: string;
};

export type ChapterSEOInput = {
  authorName?: string | null;
  content: string;
  episodeNumber?: number;
  genreName?: string | null;
  isIndexable?: boolean;
  storySlug?: string | null;
  storyTitle: string;
  tagNames?: string[];
  title: string;
};

export type SEOChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
};
