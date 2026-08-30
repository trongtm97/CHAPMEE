import { DEFAULT_CHAPTER_REACTION_TYPES } from "@/lib/reactions/chapter-reaction-defaults";

export type ChapterReactionTypeKey =
  | "funny"
  | "wow"
  | "cry"
  | "angry"
  | "hooked"
  | "next"
  | "love";

export type ChapterReactionTypeRow = {
  key: string;
  label: string;
  emoji: string;
  isEnabled: boolean;
  sortOrder: number;
};

/** Fallback catalog when DB is unavailable — prefer listChapterReactionTypes(). */
export const CHAPTER_REACTION_OPTIONS = DEFAULT_CHAPTER_REACTION_TYPES.map((item) => ({
  key: item.key as ChapterReactionTypeKey,
  label: item.label,
  emoji: item.emoji
}));

export type ReactionOption = {
  key: string;
  label: string;
  emoji: string;
};

export type ChapterReactionTypeView = {
  key: string;
  label: string;
  emoji: string;
  realCount: number;
  seedCount: number;
  visibleCount: number;
  isSelected: boolean;
};

export type ChapterReactionsSnapshot = {
  chapterId: string;
  canReact: boolean;
  types: ChapterReactionTypeView[];
};

export type ToggleChapterReactionResult = {
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  snapshot: ChapterReactionsSnapshot | null;
  toggledOff?: boolean;
};

/** @deprecated Legacy single-select reaction keys — use catalog keys from DB. */
export type ChapterReactionKey = ChapterReactionTypeKey;

/** @deprecated Use ChapterReactionsSnapshot from getChapterReactions. */
export type ChapterReactionView = ChapterReactionsSnapshot & {
  storyId?: string;
  totalReactions?: number;
  userReactionKey?: string | null;
  hasReacted?: boolean;
  dominantReactionKey?: string | null;
  options?: Array<ChapterReactionTypeView & { percent?: number }>;
};




