import type { ContactSettings, ContactSettingsDb } from "@/types/contact-settings";

export const CONTACT_SETTINGS_KEY = "contact_settings";
export const CONTACT_SETTINGS_CACHE_TAG = "contact-settings";

export const DEFAULT_CONTACT_SETTINGS_DB: ContactSettingsDb = {
  support_email: "",
  enable_support_email: false,
  facebook_url: "",
  enable_facebook: false,
  telegram_url: "",
  enable_telegram: false,
  enable_feedback_form: true,
  contact_title: "Liên hệ & Góp ý",
  contact_description: "Báo lỗi, góp ý hoặc liên hệ với ChapMee."
};

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  supportEmail: DEFAULT_CONTACT_SETTINGS_DB.support_email,
  enableSupportEmail: DEFAULT_CONTACT_SETTINGS_DB.enable_support_email,
  facebookUrl: DEFAULT_CONTACT_SETTINGS_DB.facebook_url,
  enableFacebook: DEFAULT_CONTACT_SETTINGS_DB.enable_facebook,
  telegramUrl: DEFAULT_CONTACT_SETTINGS_DB.telegram_url,
  enableTelegram: DEFAULT_CONTACT_SETTINGS_DB.enable_telegram,
  enableFeedbackForm: DEFAULT_CONTACT_SETTINGS_DB.enable_feedback_form,
  contactTitle: DEFAULT_CONTACT_SETTINGS_DB.contact_title,
  contactDescription: DEFAULT_CONTACT_SETTINGS_DB.contact_description
};
