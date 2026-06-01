import type { ContactSettings, ContactSettingsDb } from "@/types/contact-settings";
import { ALL_FEEDBACK_TYPES } from "@/lib/feedback/constants";

export const CONTACT_SETTINGS_KEY = "contact_settings";
export const CONTACT_SETTINGS_CACHE_TAG = "contact-settings";

export const DEFAULT_CONTACT_SETTINGS_DB: ContactSettingsDb = {
  support_email: "",
  enable_support_email: false,
  email_label: "Gửi email",
  facebook_url: "",
  enable_facebook: false,
  fanpage_label: "Fanpage",
  telegram_url: "",
  enable_telegram: false,
  telegram_label: "Telegram",
  enable_feedback_form: true,
  contact_title: "Liên hệ & Góp ý",
  contact_description: "Báo lỗi, góp ý hoặc liên hệ với ChapMee.",
  allowed_feedback_types: [...ALL_FEEDBACK_TYPES],
  require_login: true,
  require_contact_email: false,
  require_screenshot: false,
  daily_limit_per_user: 5,
  cooldown_seconds: 60
};

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  supportEmail: DEFAULT_CONTACT_SETTINGS_DB.support_email,
  enableSupportEmail: DEFAULT_CONTACT_SETTINGS_DB.enable_support_email,
  emailLabel: DEFAULT_CONTACT_SETTINGS_DB.email_label,
  facebookUrl: DEFAULT_CONTACT_SETTINGS_DB.facebook_url,
  enableFacebook: DEFAULT_CONTACT_SETTINGS_DB.enable_facebook,
  fanpageLabel: DEFAULT_CONTACT_SETTINGS_DB.fanpage_label,
  telegramUrl: DEFAULT_CONTACT_SETTINGS_DB.telegram_url,
  enableTelegram: DEFAULT_CONTACT_SETTINGS_DB.enable_telegram,
  telegramLabel: DEFAULT_CONTACT_SETTINGS_DB.telegram_label,
  enableFeedbackForm: DEFAULT_CONTACT_SETTINGS_DB.enable_feedback_form,
  contactTitle: DEFAULT_CONTACT_SETTINGS_DB.contact_title,
  contactDescription: DEFAULT_CONTACT_SETTINGS_DB.contact_description,
  allowedFeedbackTypes: [...ALL_FEEDBACK_TYPES],
  requireLogin: DEFAULT_CONTACT_SETTINGS_DB.require_login,
  requireContactEmail: DEFAULT_CONTACT_SETTINGS_DB.require_contact_email,
  requireScreenshot: DEFAULT_CONTACT_SETTINGS_DB.require_screenshot,
  dailyLimitPerUser: DEFAULT_CONTACT_SETTINGS_DB.daily_limit_per_user,
  cooldownSeconds: DEFAULT_CONTACT_SETTINGS_DB.cooldown_seconds
};
