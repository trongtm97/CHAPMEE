export type MilestoneType = "reader" | "author" | "story" | "comment" | "general";

export type MilestoneTone = "default" | "success" | "warning" | "danger";

export type MilestoneDefinition = {
  key: string;
  title: string;
  description: string;
  milestoneType: MilestoneType;
  icon: string;
  tone: MilestoneTone;
};

export type MilestoneRecord = {
  id: string;
  userId: string;
  milestoneKey: string;
  milestoneType: MilestoneType;
  title: string;
  description: string;
  relatedStoryId: string | null;
  relatedAuthorId: string | null;
  relatedCommentId: string | null;
  value: number | null;
  metadata: Record<string, unknown> | null;
  achievedAt: string;
  createdAt: string;
};

export type MilestoneViewItem = MilestoneRecord & {
  icon: string;
  tone: MilestoneTone;
  achievedLabel: string;
};

export type MilestoneToastNotice = {
  title: string;
  description: string;
  href: string;
};

