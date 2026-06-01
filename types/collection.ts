export type CollectionVisibility = "public" | "private";

export type CollectionStoryItem = {
  id: string;
  storyId: string;
  title: string;
  slug: string;
  publicCode: string;
  coverUrl: string | null;
  hook: string | null;
  authorName: string | null;
  genreName: string | null;
  note: string | null;
  sortOrder: number;
  createdAt: string;
};

export type CollectionSummary = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  visibility: CollectionVisibility;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  previewStories: CollectionStoryItem[];
};

export type CollectionDetail = CollectionSummary & {
  user: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  isOwner: boolean;
  items: CollectionStoryItem[];
};

export type CollectionFormValues = {
  title: string;
  description: string;
  visibility: CollectionVisibility;
};