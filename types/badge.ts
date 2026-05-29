export type BadgeType = "reader" | "author" | "general";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type BadgeDefinition = {
  id?: string;
  key: string;
  name: string;
  description: string;
  type: BadgeType;
  icon: string;
  rarity: BadgeRarity;
};

export type BadgeRecord = {
  id: string;
  awardedAt: string;
  relatedStoryId: string | null;
  metadata: Record<string, unknown> | null;
  definition: BadgeDefinition;
};

export type BadgeViewItem = BadgeRecord & {
  unlockLabel: string;
};
