export type StoryGroupVisibility = "public" | "private";

export type StoryGroupRow = {
  id: string;
  storyId: string;
  groupSlug: string;
  title: string;
  description: string | null;
  visibility: StoryGroupVisibility;
  memberCount: number;
  activityCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InteractionModerationStatus =
  | "pending"
  | "approved"
  | "flagged"
  | "hidden"
  | "rejected";

export type SpoilerLevel = "none" | "mild" | "major";

export type GroupFeedVisibility = "visible" | "hidden" | "moderated" | "deleted";

export type NotifyGroupMembersDefault = "all" | "important_only" | "none";

export type CommunitySyncSettings = {
  autoCreateStoryGroup: boolean;
  syncChapterComments: boolean;
  syncReelComments: boolean;
  syncAudioComments: boolean;
  syncAdaptationComments: boolean;
  syncReviews: boolean;
  syncAuthorReplies: boolean;
  collapseWindowMinutes: number;
  maxActivityItemsPerSourcePerHour: number;
  minCommentLengthToSurface: number;
  hideSpamFromGroup: boolean;
  requireModerationForNewAccounts: boolean;
  spoilerProtectionEnabled: boolean;
  paidChapterCommentPreview: number;
  authorCanPinGroupItems: boolean;
  authorCanHideGroupItems: boolean;
  notifyGroupMembersDefault: NotifyGroupMembersDefault;
};

export type BackfillStoryGroupsResult = {
  dryRun: boolean;
  candidates: number;
  created: number;
  skipped: number;
  errors: number;
};

export type RebuildGroupFeedProjectionResult = {
  dryRun: boolean;
  eventsScanned: number;
  projected: number;
  aggregated: number;
  individual: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  hasMore: boolean;
  nextOffset: number;
};

export type GroupFeedItemView = {
  id: string;
  groupId: string;
  storyId: string;
  itemType: string;
  sourceEventId: string | null;
  sourceCommentId: string | null;
  title: string | null;
  excerpt: string | null;
  targetUrl: string | null;
  sourceEntityType: string;
  sourceEntityId: string;
  score: number;
  visibility: GroupFeedVisibility;
  moderationStatus: InteractionModerationStatus;
  spoilerLevel: SpoilerLevel;
  sourceChapterOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StoryGroupFeedPageResult = {
  items: GroupFeedItemView[];
  nextCursor: string | null;
  hasMore: boolean;
  groupId: string | null;
  storyId: string | null;
  error: string | null;
};
