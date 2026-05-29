export type StoryCatalogSort = "updated" | "hot" | "reads" | "new" | "completed" | "quick";

export type StoryCatalogStatus = "all" | "ongoing" | "completed";

export type StoryCatalogStory = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  shortDescription: string | null;
  coverUrl: string | null;
  creatorName: string | null;
  genreName: string | null;
  genreSlug: string | null;
  publishedAt: string | null;
  isCompleted: boolean;
  score: number;
};

export type StoryCatalogGenre = {
  slug: string;
  name: string;
  storyCount: number;
};
