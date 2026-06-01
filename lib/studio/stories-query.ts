import type { StudioListPageSize, StudioStoryListFilter, StudioStorySort } from "@/types/studio";

export function buildStoriesQuery(input: {
  filter: StudioStoryListFilter;
  page?: string;
  pageSize?: StudioListPageSize;
  search: string;
  sort: StudioStorySort;
  contentType?: string;
  mainGenreTerm?: string;
  subgenreTerm?: string;
  presentationMode?: string;
  ageRatingTerm?: string;
  hasWarning?: string;
}) {
  return {
    page: input.page,
    q: input.search || undefined,
    size: input.pageSize === 10 ? undefined : String(input.pageSize),
    sort: input.sort === "updated" ? undefined : input.sort,
    status: input.filter === "all" ? undefined : input.filter,
    contentType: input.contentType || undefined,
    mainGenreTerm: input.mainGenreTerm || undefined,
    subgenreTerm: input.subgenreTerm || undefined,
    presentationMode: input.presentationMode || undefined,
    ageRatingTerm: input.ageRatingTerm || undefined,
    hasWarning: input.hasWarning || undefined
  };
}
