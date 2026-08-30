import { FACEBOOK_ICON_CATEGORIES as BASE_CATEGORIES } from "@/lib/utilities/facebook-icon-categories";
import type { FacebookIconCategory } from "@/lib/utilities/facebook-icon-categories";
import { normalizeEmojiString } from "@/lib/utilities/emoji-twemoji";
import {
  FACEBOOK_ICON_SUPPLEMENTS,
  mergeUniqueEmojis
} from "@/lib/utilities/facebook-icon-supplements";

function normalizeEmojiList(emojis: string[]): string[] {
  return emojis.map((emoji) => normalizeEmojiString(emoji));
}

/** run.vn set + extra Facebook Unicode icons (deduped per category). */
export const FACEBOOK_ICON_CATALOG: FacebookIconCategory[] = BASE_CATEGORIES.map((category) => ({
  ...category,
  emojis: normalizeEmojiList(
    mergeUniqueEmojis(category.emojis, FACEBOOK_ICON_SUPPLEMENTS[category.id] ?? [])
  )
}));

export const FACEBOOK_ICON_CATALOG_COUNT = FACEBOOK_ICON_CATALOG.reduce(
  (total, category) => total + category.emojis.length,
  0
);
