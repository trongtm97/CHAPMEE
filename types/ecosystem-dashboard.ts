export const ECOSYSTEM_SURFACE_FILTERS = [
  "all",
  "reels",
  "discover",
  "search",
  "ranking"
] as const;

export type EcosystemSurfaceFilter = (typeof ECOSYSTEM_SURFACE_FILTERS)[number];

export const ECOSYSTEM_TIME_WINDOWS = ["1d", "7d", "30d"] as const;
export type EcosystemTimeWindow = (typeof ECOSYSTEM_TIME_WINDOWS)[number];

export type EcosystemOverview = {
  totalImpressions: number;
  authorsWithImpressions: number;
  storiesWithImpressions: number;
  top1AuthorSharePercent: number;
  top10StorySharePercent: number;
  newAuthorExposureShare: number;
  longTailExposureShare: number;
  underExposedQualityCount: number;
  untestedNewStoriesCount: number;
};

export type EcosystemWarning = {
  id: string;
  level: "warn" | "critical";
  message: string;
};

export type EcosystemTopAuthorRow = {
  userId: string;
  username: string | null;
  displayName: string;
  profileUrl: string;
  impressions: number;
  sharePercent: number;
  storyCount: number;
  qualityAvg: number;
  revenueCoin: number;
  overCap: boolean;
};

export type EcosystemTopStoryRow = {
  storyId: string;
  title: string;
  slug: string;
  authorDisplayName: string;
  authorUsername: string | null;
  impressions: number;
  sharePercent: number;
  completionRate: number;
  reportRate: number;
  status: string;
  overCap: boolean;
};

export type EcosystemUnderExposedRow = {
  storyId: string;
  title: string;
  slug: string;
  authorDisplayName: string;
  authorUsername: string | null;
  impressions: number;
  completionRate: number;
  qualityScore: number;
  recommendedAction: string;
};

export type EcosystemNewAuthorRow = {
  userId: string;
  username: string | null;
  displayName: string;
  profileUrl: string;
  publishedStories: number;
  impressionsReceived: number;
  coldStartStatus: string | null;
};

export type EcosystemGenreRow = {
  genreId: string;
  genreName: string;
  genreSlug: string;
  impressionSharePercent: number;
  readSharePercent: number;
  completionRate: number;
  skewWarning: boolean;
};

export type EcosystemAdjustmentRow = {
  id: string;
  adjustmentType: string;
  surface: string;
  itemType: string;
  reason: string | null;
  oldScore: number;
  newScore: number;
  createdAt: string;
};

export type EcosystemDashboardData = {
  error: string | null;
  surface: EcosystemSurfaceFilter;
  timeWindow: EcosystemTimeWindow;
  surfaceLabel: string;
  windowLabel: string;
  overview: EcosystemOverview;
  warnings: EcosystemWarning[];
  topAuthors: EcosystemTopAuthorRow[];
  topStories: EcosystemTopStoryRow[];
  underExposed: EcosystemUnderExposedRow[];
  newAuthors: EcosystemNewAuthorRow[];
  genres: EcosystemGenreRow[];
  recentAdjustments: EcosystemAdjustmentRow[];
  thresholds: {
    top1AuthorPercent: number;
    top10StoryPercent: number;
    minNewAuthorPercent: number;
    minLongTailPercent: number;
    authorExposureCapPercent: number;
    storyExposureCapPercent: number;
    untestedStoriesThreshold: number;
  };
};

export function mapEcosystemWindowToFairness(
  window: EcosystemTimeWindow
): "24h" | "7d" | "30d" {
  if (window === "1d") return "24h";
  if (window === "30d") return "30d";
  return "7d";
}

export function parseEcosystemSurface(value: string | undefined): EcosystemSurfaceFilter {
  if (value && ECOSYSTEM_SURFACE_FILTERS.includes(value as EcosystemSurfaceFilter)) {
    return value as EcosystemSurfaceFilter;
  }
  return "all";
}

export function parseEcosystemTimeWindow(value: string | undefined): EcosystemTimeWindow {
  if (value && ECOSYSTEM_TIME_WINDOWS.includes(value as EcosystemTimeWindow)) {
    return value as EcosystemTimeWindow;
  }
  return "7d";
}

export const ECOSYSTEM_SURFACE_LABELS: Record<EcosystemSurfaceFilter, string> = {
  all: "Tất cả surface",
  reels: "Reels",
  discover: "Khám phá",
  search: "Tìm kiếm",
  ranking: "Bảng xếp hạng"
};

export const ECOSYSTEM_WINDOW_LABELS: Record<EcosystemTimeWindow, string> = {
  "1d": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày"
};
