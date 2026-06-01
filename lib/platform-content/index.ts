export {
  listContentPosts,
  getContentPostById,
  getContentPostBySlug,
  getContentPostByPublicCode,
  isContentPostSlugTaken,
  createContentPost,
  updateContentPost,
  updateContentPostStatus
} from "@/lib/platform-content/content-posts";

export {
  listAnnouncements,
  getAnnouncementById,
  getAnnouncementBySlug,
  getAnnouncementByPublicCode,
  isAnnouncementSlugTaken,
  createAnnouncement,
  updateAnnouncement,
  updateAnnouncementStatus,
  isAnnouncementPubliclyVisible
} from "@/lib/platform-content/announcements";

export {
  listNotificationCampaigns,
  getNotificationCampaignById,
  createNotificationCampaign,
  updateNotificationCampaign,
  estimateNotificationRecipients,
  sendNotificationCampaign,
  createUserNotificationsForCampaign,
  resolveCampaignRecipientUserIds,
  listUserNotifications,
  markNotificationRead,
  markAllUserNotificationsRead,
  getUnreadCampaignNotificationCount,
  listSeoRules,
  updateSeoRule,
  listSeoAuditLogs
} from "@/lib/platform-content/notification-campaigns";

export {
  getSeoRuleForRoute,
  buildSeoMetadata,
  shouldNoIndexRoute,
  buildPrivateRouteMetadata,
  DEFAULT_NOINDEX_ROUTE_PATTERNS,
  DEFAULT_INDEX_ROUTE_PATTERNS,
  normalizePathname,
  patternMatchesRoute
} from "@/lib/platform-content/seo-governance";
