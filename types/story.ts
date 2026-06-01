export type StoryCatalogSort =
  | "updated"
  | "hot"
  | "reads"
  | "new"
  | "completed"
  | "quick"
  | "title"
  | "chapters"
  | "saved"
  | "price_asc"
  | "price_desc"
  | "chapter_price_asc"
  | "chapter_price_desc";

export type StoryCatalogStatus = "all" | "ongoing" | "completed";

export type StoryCatalogStory = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  hook: string | null;
  shortDescription: string | null;
  coverUrl: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
  genreName: string | null;
  genreSlug: string | null;
  publishedAt: string | null;
  isCompleted: boolean;
  score: number;
  href?: string;
  tagPreview?: string[];
  chapterCount?: number;
  structureType?: "chaptered" | "standalone";
  standaloneReadingTimeMinutes?: number;
  accessLabel?: string | null;
};

export type StoryCatalogGenre = {
  slug: string;
  name: string;
  storyCount: number;
};
