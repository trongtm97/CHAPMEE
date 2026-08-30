/** Extra Unicode emojis commonly supported on Facebook — merged into run.vn categories. */
export const FACEBOOK_ICON_SUPPLEMENTS: Record<string, string[]> = {
  smileys: ["🥲", "🥹", "🫠", "🫡", "🫢", "🫣", "🫤", "🫥", "🥸", "🙂‍↔️", "🙂‍↕️"],
  gestures: [
    "🫰",
    "🫵",
    "🫶",
    "🤌",
    "🫱",
    "🫲",
    "🫳",
    "🫴",
    "🫦",
    "🫃",
    "🫄",
    "🧑‍🤝‍🧑",
    "👨‍🦽",
    "👩‍🦽",
    "👨‍🦼",
    "👩‍🦼",
    "🧑‍🦯",
    "👨‍🦯",
    "👩‍🦯"
  ],
  hearts: ["🫀", "🩷", "🩵", "🩶", "🤎", "🩴", "🪭", "🪮"],
  food: ["🧋", "🫕", "🫘", "🥮", "🧆", "🫔", "🫙", "🧇", "🧈", "🫒"],
  animals: ["🦬", "🦣", "🦫", "🐻‍❄️", "🦤", "🪶", "🦭", "🫎", "🐈‍⬛", "🐕‍🦺", "🦮"],
  nature: ["🪴", "🍄‍🟫", "🪨", "🪵", "🛖"],
  travel: ["🛻", "🛞", "🛟", "🪂", "🛸", "🪐"],
  objects: [
    "🪫",
    "🖲️",
    "🕹️",
    "🪙",
    "🪪",
    "🪬",
    "🪩",
    "🪄",
    "🪞",
    "🪟",
    "🛗",
    "🪠",
    "🪣",
    "🪥",
    "🪒",
    "🧴",
    "🧷",
    "🧹",
    "🧺",
    "🧻",
    "🧼",
    "🫧"
  ],
  symbols: ["🫟", "🛜", "🫨", "🩼"],
  flags: ["🏴‍☠️", "🏳️‍⚧️"]
};

import { normalizeEmojiString } from "@/lib/utilities/emoji-twemoji";

export function mergeUniqueEmojis(existing: string[], extra: string[]): string[] {
  const seen = new Set(existing.map((emoji) => normalizeEmojiString(emoji)));
  const merged = existing.map((emoji) => normalizeEmojiString(emoji));
  for (const emoji of extra) {
    const normalized = normalizeEmojiString(emoji);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      merged.push(normalized);
    }
  }
  return merged;
}
