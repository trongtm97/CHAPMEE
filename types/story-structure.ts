export type StoryStructureType = "chaptered" | "standalone";

export type StoryContentFormat =
  | "prose"
  | "chat_story"
  | "case_file"
  | "diary"
  | "system_game"
  | "social_feed"
  | "script"
  | "mixed_media"
  | "poem"
  | "microfiction"
  | "essay"
  | "branching_story";

export type StoryStructureFields = {
  structureType: StoryStructureType;
  contentFormat: StoryContentFormat | null;
  standaloneContentJson: unknown | null;
  standalonePlainText: string | null;
  standaloneWordCount: number;
  standaloneReadingTimeMinutes: number;
  standalonePublishedAt: string | null;
  standaloneUpdatedAt: string | null;
  episodeCount?: number;
};

export type StoryCardMeta = {
  primaryLabel: string;
  secondaryLabel: string | null;
  ctaLabel: string;
  progressLabel: string | null;
  isStandalone: boolean;
};

export type ComposerOwnerType = "chapter" | "story";

export type ComposerContext = {
  ownerType: ComposerOwnerType;
  ownerId: string;
  contentFormat: string | null;
  autosaveKey: string;
  validationMode: "draft" | "publish";
};
