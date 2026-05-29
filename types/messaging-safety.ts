export type DefaultDmPolicy =
  | "open"
  | "mutual_follow_only"
  | "request_first"
  | "disabled";

export type MessageSafetyDecisionType =
  | "allowed"
  | "blocked"
  | "needs_review"
  | "rate_limited";

export type MessageSafetyRiskLevel = "low" | "medium" | "high" | "critical";

export type MessagingRestrictionType =
  | "mute_24h"
  | "mute_7d"
  | "mute_30d"
  | "permanent_messaging_ban"
  | "link_block_only"
  | "strangers_block_only"
  | "author_dm_block_only";

export type KeywordRuleAction = "block" | "review" | "allow";

export type KeywordRuleCategory =
  | "profanity"
  | "harassment"
  | "scam"
  | "sexual"
  | "personal_info"
  | "impersonation"
  | "spam";

export type MessageReportStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed"
  | "rejected";

export type ViolationTypeCode =
  | "spam"
  | "external_link"
  | "profanity"
  | "harassment"
  | "scam"
  | "impersonation"
  | "author_spam"
  | "sexual"
  | "personal_info";

export type MessagingRestrictReasonCode =
  | "spam"
  | "inappropriate_link"
  | "harassment"
  | "author_harassment"
  | "profanity"
  | "scam"
  | "impersonation"
  | "personal_info"
  | "other";

export type MessageSafetySettings = {
  id: string;
  enabled: boolean;
  defaultDmPolicy: DefaultDmPolicy;
  newAccountDays: number;
  unverifiedDailyMessageLimit: number;
  verifiedDailyMessageLimit: number;
  trustedDailyMessageLimit: number;
  maxMessagesPerMinute: number;
  maxMessagesPerDay: number;
  maxNewRecipientsPerDay: number;
  duplicateMessageLimitPerDay: number;
  duplicateCooldownSeconds: number;
  blockExternalLinksForNewUsers: boolean;
  blockExternalLinksForUnverified: boolean;
  allowInternalLinks: boolean;
  authorProtectionEnabled: boolean;
  authorDmNewUserLimit: number;
  autoRestrictReportThreshold: number;
  updatedAt: string;
};

export type MessageSafetyKeywordRule = {
  id: string;
  keyword: string;
  action: KeywordRuleAction;
  severity: MessageSafetyRiskLevel;
  category: KeywordRuleCategory | null;
  isActive: boolean;
  createdAt: string;
};

export type MessageSafetyDecisionItem = {
  id: string;
  messageId: string | null;
  conversationId: string | null;
  senderId: string;
  senderName: string;
  senderUsername: string | null;
  recipientId: string | null;
  recipientName: string | null;
  decision: MessageSafetyDecisionType;
  riskLevel: MessageSafetyRiskLevel;
  reasonCodes: string[];
  messageExcerptMasked: string | null;
  createdAt: string;
};

export type MessagingRestrictionItem = {
  id: string;
  userId: string;
  displayName: string;
  username: string | null;
  restrictionType: MessagingRestrictionType;
  reasonCode: string;
  note: string | null;
  startsAt: string;
  endsAt: string | null;
  createdByName: string | null;
  relatedReportCount: number;
};

export type MessageReportQueueItem = {
  id: string;
  reasonCode: string;
  description: string | null;
  status: MessageReportStatus;
  riskLevel: MessageSafetyRiskLevel;
  createdAt: string;
  conversationId: string | null;
  messageId: string | null;
  reporter: { id: string; displayName: string | null; username: string | null };
  reportedUser: {
    id: string;
    displayName: string | null;
    username: string | null;
    role: string;
  };
  messagePreview: string | null;
  priorReportCount: number;
  hasBlockedKeyword: boolean;
  hasBlockedLink: boolean;
  assignedTo: string | null;
};

export type MessageReportCaseDetail = MessageReportQueueItem & {
  contextMessages: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
    isReported: boolean;
    isContextOnly: boolean;
  }[];
  safetySignals: {
    hasExternalLink: boolean;
    hasBlockedKeyword: boolean;
    hasSpamPattern: boolean;
    senderIsNewAccount: boolean;
    senderRecipients24h: number;
    senderReportCount30d: number;
    recipientIsAuthor: boolean;
  };
  reportedUserHistory: {
    reports30d: number;
    warnings: number;
    restrictionCount: number;
    activeRestriction: string | null;
  };
};
