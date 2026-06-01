import type { StudioStoryListFilter, StudioStorySort } from "@/types/studio";

export type StudioStoriesOverview = {
  total: number;
  live: number;
  draft: number;
  scheduled: number;
  rejected: number;
  completed: number;
  missingCover: number;
  reads7d: number;
};

export type StudioStoryAttentionKind =
  | "missing_cover"
  | "no_chapters"
  | "quality_warning"
  | "new_comments"
  | "stale_draft"
  | "missing_description";

export type StudioStoryAttentionFilter =
  | "all"
  | "missing_cover"
  | "needs_fix"
  | "no_chapters"
  | "missing_description";

export type StudioStoryAttentionItem = {
  id: string;
  storyId: string;
  storyTitle: string;
  kind: StudioStoryAttentionKind;
  label: string;
  ctaLabel: string;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export type StudioStoryGenreOption = {
  id: string;
  name: string;
};

export type StudioStoriesQuery = {
  filter?: StudioStoryListFilter;
  search?: string;
  sort?: StudioStorySort;
  page?: string;
  genre?: string;
  contentType?: string;
  mainGenreTerm?: string;
  subgenreTerm?: string;
  presentationMode?: string;
  ageRatingTerm?: string;
  hasWarning?: string;
};
