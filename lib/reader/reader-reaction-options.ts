import { CHAPTER_REACTION_OPTIONS, type ChapterReactionKey } from "@/types/reaction";

/** Primary row in reader reaction panel (max 5). */
export const READER_PRIMARY_REACTION_KEYS: ChapterReactionKey[] = [
  "cuon",
  "soc",
  "buon",
  "hai",
  "muon_chap_tiep"
];

/** Secondary reactions (expandable). */
export const READER_SECONDARY_REACTION_KEYS: ChapterReactionKey[] = [
  "team_nam_phu",
  "can_tra_thu"
];

export const READER_REACTION_KEYS: ChapterReactionKey[] = [
  ...READER_PRIMARY_REACTION_KEYS,
  ...READER_SECONDARY_REACTION_KEYS
];

const READER_LABEL_OVERRIDES: Partial<Record<ChapterReactionKey, { label: string; emoji: string }>> = {
  buon: { label: "Buồn", emoji: "😢" },
  muon_chap_tiep: { label: "Muốn chương tiếp", emoji: "👉" },
  team_nam_phu: { label: "Team nhân vật", emoji: "🛡" },
  can_tra_thu: { label: "Cần trả thù", emoji: "⚔" }
};

export const READER_REACTION_OPTIONS = READER_REACTION_KEYS.map((key) => {
  const base = CHAPTER_REACTION_OPTIONS.find((item) => item.key === key);
  const override = READER_LABEL_OVERRIDES[key];
  return {
    key,
    label: override?.label ?? base?.label ?? key,
    emoji: override?.emoji ?? base?.emoji ?? "✨"
  };
});
