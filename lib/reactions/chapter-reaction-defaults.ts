/** Fallback seed when DB catalog is unavailable (mirrors drizzle/0012 seed). */
export const DEFAULT_CHAPTER_REACTION_TYPES = [
  { key: "funny", label: "Hài", emoji: "😂", sortOrder: 10 },
  { key: "wow", label: "Sốc", emoji: "😮", sortOrder: 20 },
  { key: "cry", label: "Khóc", emoji: "😭", sortOrder: 30 },
  { key: "angry", label: "Phẫn nộ", emoji: "😡", sortOrder: 40 },
  { key: "hooked", label: "Cuốn", emoji: "🔥", sortOrder: 50 },
  { key: "next", label: "Muốn chương tiếp", emoji: "👉", sortOrder: 60 },
  { key: "love", label: "Thích", emoji: "❤️", sortOrder: 70 }
] as const;

export type ChapterReactionOrigin = "user" | "admin_seed" | "system_seed";

export const USER_REACTION_ORIGIN: ChapterReactionOrigin = "user";
