export type ChapterReactionKey =
  | "cuon"
  | "soc"
  | "tuc"
  | "buon"
  | "hai"
  | "muon_chap_tiep"
  | "team_nam_phu"
  | "can_tra_thu";

export type ReactionOption = {
  key: ChapterReactionKey;
  label: string;
  emoji: string;
};

export type ChapterReactionRecord = {
  id: string;
  chapterId: string;
  storyId: string;
  userId: string;
  reactionKey: ChapterReactionKey;
  createdAt: string;
  updatedAt: string;
};

export type ChapterReactionOptionView = ReactionOption & {
  count: number;
  percent: number;
  isSelected: boolean;
};

export type ChapterReactionView = {
  chapterId: string;
  storyId: string;
  totalReactions: number;
  userReactionKey: ChapterReactionKey | null;
  hasReacted: boolean;
  dominantReactionKey: ChapterReactionKey | null;
  options: ChapterReactionOptionView[];
  canReact: boolean;
};

export const CHAPTER_REACTION_OPTIONS: ReactionOption[] = [
  { key: "cuon", label: "Cuốn", emoji: "🔥" },
  { key: "soc", label: "Sốc", emoji: "😱" },
  { key: "tuc", label: "Tức", emoji: "😡" },
  { key: "buon", label: "Buồn", emoji: "🥺" },
  { key: "hai", label: "Hài", emoji: "😂" },
  { key: "muon_chap_tiep", label: "Muốn chap tiếp", emoji: "👉" },
  { key: "team_nam_phu", label: "Team nam phụ", emoji: "💔" },
  { key: "can_tra_thu", label: "Cần trả thù", emoji: "⚔️" }
];
