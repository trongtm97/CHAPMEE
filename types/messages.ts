export const messagePrivacyOptions = [
  "everyone",
  "followers_only",
  "mutual_follow_only",
  "no_one"
] as const;

export type MessagePrivacyLevel = (typeof messagePrivacyOptions)[number];

export type MessagePrivacySettings = {
  userId: string;
  whoCanMessage: MessagePrivacyLevel;
  allowMessageRequests: boolean;
  filterSensitiveMessages: boolean;
  blockLinksFromStrangers: boolean;
  updatedAt: string;
};

export const messageRequestStatuses = [
  "pending",
  "accepted",
  "rejected",
  "blocked"
] as const;

export type MessageRequestStatus = (typeof messageRequestStatuses)[number];

export const messageSafetyStatuses = [
  "clean",
  "warning",
  "blocked",
  "review",
  "hidden"
] as const;

export type MessageSafetyStatus = (typeof messageSafetyStatuses)[number];

export type MessageSafetyResult = {
  status: "clean" | "warning" | "blocked" | "review";
  reasons: string[];
  normalizedText?: string;
};

export const messageReportReasons = [
  { value: "spam", label: "Spam / quảng cáo" },
  { value: "harassment", label: "Quấy rối / xúc phạm" },
  { value: "profanity", label: "Tin nhắn tục tĩu" },
  { value: "sexual_harassment", label: "Gạ gẫm không phù hợp" },
  { value: "scam", label: "Lừa đảo / giả mạo" },
  { value: "off_platform", label: "Dụ giao dịch ngoài ChapMee" },
  { value: "privacy", label: "Tiết lộ thông tin cá nhân" },
  { value: "other", label: "Khác" }
] as const;

export type MessageReportReasonCode =
  (typeof messageReportReasons)[number]["value"];

export type InboxConversationItem = {
  id: string;
  otherUser: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
};

export type MessageRequestItem = {
  id: string;
  requester: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
  firstMessage: string;
  createdAt: string;
  status: MessageRequestStatus;
};

export type MessageDisplayState =
  | "normal"
  | "deleted"
  | "removed_by_moderator"
  | "review";

export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export type ConversationMessage = {
  id: string;
  senderId: string;
  body: string;
  bodySafetyStatus: MessageSafetyStatus;
  createdAt: string;
  isOwn: boolean;
  displayState: MessageDisplayState;
  deliveryStatus?: MessageDeliveryStatus;
  clientId?: string;
};

export type ConversationDetail = {
  id: string;
  status: string;
  currentUserId: string;
  filterSensitiveMessages: boolean;
  otherUser: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    lastReadAt: string | null;
  };
  messages: ConversationMessage[];
  participant: {
    isMuted: boolean;
    isArchived: boolean;
    lastReadAt: string | null;
  };
  messaging: {
    composerDisabledReason: string | null;
    blockState: "none" | "blocked_by_me" | "blocked_by_other";
  };
};

export type CanMessageResult =
  | { allowed: true; mode: "direct" | "request" }
  | { allowed: false; reason: string };

export type MessageModerationReportItem = {
  id: string;
  reasonCode: MessageReportReasonCode;
  detail: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string | null; username: string | null };
  reportedUser: {
    id: string;
    displayName: string | null;
    username: string | null;
  };
  messagePreview: string | null;
  conversationId: string;
  contextMessages: ConversationMessage[];
  priorReportCount: number;
};
