export type ContactSettingsDb = {
  support_email: string;
  enable_support_email: boolean;
  email_label: string;
  facebook_url: string;
  enable_facebook: boolean;
  fanpage_label: string;
  telegram_url: string;
  enable_telegram: boolean;
  telegram_label: string;
  enable_feedback_form: boolean;
  contact_title: string;
  contact_description: string;
  allowed_feedback_types: string[];
  require_login: boolean;
  require_contact_email: boolean;
  require_screenshot: boolean;
  daily_limit_per_user: number;
  cooldown_seconds: number;
};

export type ContactSettings = {
  supportEmail: string;
  enableSupportEmail: boolean;
  emailLabel: string;
  facebookUrl: string;
  enableFacebook: boolean;
  fanpageLabel: string;
  telegramUrl: string;
  enableTelegram: boolean;
  telegramLabel: string;
  enableFeedbackForm: boolean;
  contactTitle: string;
  contactDescription: string;
  allowedFeedbackTypes: FeedbackType[];
  requireLogin: boolean;
  requireContactEmail: boolean;
  requireScreenshot: boolean;
  dailyLimitPerUser: number;
  cooldownSeconds: number;
};

export type ContactModuleStatus = "active" | "incomplete" | "disabled";

export type ContactSettingsValidationErrors = Partial<
  Record<
    | "supportEmail"
    | "facebookUrl"
    | "telegramUrl"
    | "contactTitle"
    | "contactDescription"
    | "allowedFeedbackTypes"
    | "dailyLimitPerUser"
    | "cooldownSeconds"
    | "form",
    string
  >
>;

export type FeedbackType =
  | "suggestion"
  | "bug"
  | "complaint"
  | "payment_coin"
  | "story_chapter"
  | "account"
  | "safety_abuse"
  | "other"
  | "feature"
  | "payment"
  | "content_report"
  | "partnership"
  | "feedback";

export type FeedbackStatus =
  | "new"
  | "reviewing"
  | "need_more_info"
  | "replied"
  | "resolved"
  | "closed"
  | "rejected";

export type FeedbackPriority = "low" | "normal" | "high" | "urgent";

export type FeedbackMessageRow = {
  id: string;
  code: string | null;
  user_id: string | null;
  category: FeedbackType;
  title: string | null;
  message: string;
  contact_email: string | null;
  related_url: string | null;
  screenshot_url: string | null;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  internal_note: string | null;
  admin_reply: string | null;
  assigned_admin_id: string | null;
  source: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
};

export type FeedbackAttachmentRow = {
  id: string;
  feedback_id: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

export type FeedbackEventRow = {
  id: string;
  feedback_id: string;
  admin_id: string | null;
  event_type: string;
  old_status: FeedbackStatus | null;
  new_status: FeedbackStatus | null;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
  admin_label?: string | null;
};

export type AdminFeedbackListItem = FeedbackMessageRow & {
  user_display_name: string | null;
  user_username: string | null;
  assigned_admin_label?: string | null;
  attachment_count?: number;
  user_feedback_count_24h?: number;
};

export type AdminFeedbackDetail = AdminFeedbackListItem & {
  events: FeedbackEventRow[];
  attachments?: FeedbackAttachmentRow[];
  user_avatar_url?: string | null;
};
