import type { ReelsSourceType } from "@/types/reels";

export type ChapterReelsPromoDraft = {
  enabled: boolean;
  hook: string;
  body: string;
  sourceType?: ReelsSourceType;
  sourceTextStart?: number | null;
  sourceTextEnd?: number | null;
};

export type ChapterReelsPromoRecord = ChapterReelsPromoDraft & {
  reelId: string | null;
  reelStatus: "draft" | "published" | "scheduled" | "hidden" | null;
};
