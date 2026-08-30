import { DEFAULT_CHAPTER_REACTION_TYPES } from "@/lib/reactions/chapter-reaction-defaults";
import type { ChapterReactionTypeKey } from "@/types/reaction";

/** @deprecated Use catalog from DB via getChapterReactions. */
export const READER_REACTION_OPTIONS = DEFAULT_CHAPTER_REACTION_TYPES.map((item) => ({
  key: item.key as ChapterReactionTypeKey,
  label: item.label,
  emoji: item.emoji
}));

/** @deprecated */
export const READER_PRIMARY_REACTION_KEYS = READER_REACTION_OPTIONS.map((item) => item.key);
export const READER_SECONDARY_REACTION_KEYS: ChapterReactionTypeKey[] = [];
export const READER_REACTION_KEYS = READER_PRIMARY_REACTION_KEYS;
