import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_CONTACT_SETTINGS_DB
} from "@/lib/settings/default-contact-settings";
import { ALL_FEEDBACK_TYPES, normalizeFeedbackType } from "@/lib/feedback/constants";
import type { ContactSettings, ContactSettingsDb, FeedbackType } from "@/types/contact-settings";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asFeedbackTypes(value: unknown): FeedbackType[] {
  if (!Array.isArray(value)) {
    return [...ALL_FEEDBACK_TYPES];
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? normalizeFeedbackType(item) : null))
    .filter((item): item is FeedbackType => item !== null);

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...ALL_FEEDBACK_TYPES];
}

export function parseContactSettingsDb(value: unknown): ContactSettingsDb {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    support_email: asString(raw.support_email, DEFAULT_CONTACT_SETTINGS_DB.support_email),
    enable_support_email: asBoolean(
      raw.enable_support_email,
      DEFAULT_CONTACT_SETTINGS_DB.enable_support_email
    ),
    email_label: asString(raw.email_label, DEFAULT_CONTACT_SETTINGS_DB.email_label),
    facebook_url: asString(raw.facebook_url, DEFAULT_CONTACT_SETTINGS_DB.facebook_url),
    enable_facebook: asBoolean(
      raw.enable_facebook,
      DEFAULT_CONTACT_SETTINGS_DB.enable_facebook
    ),
    fanpage_label: asString(raw.fanpage_label, DEFAULT_CONTACT_SETTINGS_DB.fanpage_label),
    telegram_url: asString(raw.telegram_url, DEFAULT_CONTACT_SETTINGS_DB.telegram_url),
    enable_telegram: asBoolean(
      raw.enable_telegram,
      DEFAULT_CONTACT_SETTINGS_DB.enable_telegram
    ),
    telegram_label: asString(raw.telegram_label, DEFAULT_CONTACT_SETTINGS_DB.telegram_label),
    enable_feedback_form: asBoolean(
      raw.enable_feedback_form,
      DEFAULT_CONTACT_SETTINGS_DB.enable_feedback_form
    ),
    contact_title: asString(raw.contact_title, DEFAULT_CONTACT_SETTINGS_DB.contact_title),
    contact_description: asString(
      raw.contact_description,
      DEFAULT_CONTACT_SETTINGS_DB.contact_description
    ),
    allowed_feedback_types: asFeedbackTypes(raw.allowed_feedback_types),
    require_login: asBoolean(raw.require_login, DEFAULT_CONTACT_SETTINGS_DB.require_login),
    require_contact_email: asBoolean(
      raw.require_contact_email,
      DEFAULT_CONTACT_SETTINGS_DB.require_contact_email
    ),
    require_screenshot: asBoolean(
      raw.require_screenshot,
      DEFAULT_CONTACT_SETTINGS_DB.require_screenshot
    ),
    daily_limit_per_user: asNumber(
      raw.daily_limit_per_user,
      DEFAULT_CONTACT_SETTINGS_DB.daily_limit_per_user
    ),
    cooldown_seconds: asNumber(
      raw.cooldown_seconds,
      DEFAULT_CONTACT_SETTINGS_DB.cooldown_seconds
    )
  };
}

export function toContactSettings(db: ContactSettingsDb): ContactSettings {
  return {
    supportEmail: db.support_email.trim(),
    enableSupportEmail: db.enable_support_email,
    emailLabel: db.email_label.trim() || DEFAULT_CONTACT_SETTINGS.emailLabel,
    facebookUrl: db.facebook_url.trim(),
    enableFacebook: db.enable_facebook,
    fanpageLabel: db.fanpage_label.trim() || DEFAULT_CONTACT_SETTINGS.fanpageLabel,
    telegramUrl: db.telegram_url.trim(),
    enableTelegram: db.enable_telegram,
    telegramLabel: db.telegram_label.trim() || DEFAULT_CONTACT_SETTINGS.telegramLabel,
    enableFeedbackForm: db.enable_feedback_form,
    contactTitle: db.contact_title.trim() || DEFAULT_CONTACT_SETTINGS.contactTitle,
    contactDescription:
      db.contact_description.trim() || DEFAULT_CONTACT_SETTINGS.contactDescription,
    allowedFeedbackTypes: asFeedbackTypes(db.allowed_feedback_types),
    requireLogin: db.require_login,
    requireContactEmail: db.require_contact_email,
    requireScreenshot: db.require_screenshot,
    dailyLimitPerUser: Math.max(1, Math.min(50, db.daily_limit_per_user)),
    cooldownSeconds: Math.max(10, Math.min(3600, db.cooldown_seconds))
  };
}

export function toContactSettingsDb(settings: ContactSettings): ContactSettingsDb {
  return {
    support_email: settings.supportEmail.trim(),
    enable_support_email: settings.enableSupportEmail,
    email_label: settings.emailLabel.trim(),
    facebook_url: settings.facebookUrl.trim(),
    enable_facebook: settings.enableFacebook,
    fanpage_label: settings.fanpageLabel.trim(),
    telegram_url: settings.telegramUrl.trim(),
    enable_telegram: settings.enableTelegram,
    telegram_label: settings.telegramLabel.trim(),
    enable_feedback_form: settings.enableFeedbackForm,
    contact_title: settings.contactTitle.trim(),
    contact_description: settings.contactDescription.trim(),
    allowed_feedback_types: settings.allowedFeedbackTypes,
    require_login: settings.requireLogin,
    require_contact_email: settings.requireContactEmail,
    require_screenshot: settings.requireScreenshot,
    daily_limit_per_user: settings.dailyLimitPerUser,
    cooldown_seconds: settings.cooldownSeconds
  };
}

export function isSupportEmailVisible(settings: ContactSettings) {
  return settings.enableSupportEmail && settings.supportEmail.length > 0;
}

export function isFacebookVisible(settings: ContactSettings) {
  return settings.enableFacebook && settings.facebookUrl.length > 0;
}

export function isTelegramVisible(settings: ContactSettings) {
  return settings.enableTelegram && settings.telegramUrl.length > 0;
}

export function isFeedbackFormVisible(settings: ContactSettings) {
  return (
    settings.enableFeedbackForm && settings.allowedFeedbackTypes.length > 0
  );
}

export function hasVisibleContactChannel(settings: ContactSettings) {
  return (
    isSupportEmailVisible(settings) ||
    isFacebookVisible(settings) ||
    isTelegramVisible(settings) ||
    isFeedbackFormVisible(settings)
  );
}

export function getContactModuleStatus(
  settings: ContactSettings,
  errors: Record<string, string | undefined> = {}
) {
  if (!hasVisibleContactChannel(settings)) {
    return "disabled" as const;
  }

  if (Object.keys(errors).length > 0) {
    return "incomplete" as const;
  }

  if (
    (settings.enableSupportEmail && !settings.supportEmail.trim()) ||
    (settings.enableFacebook && !settings.facebookUrl.trim()) ||
    (settings.enableTelegram && !settings.telegramUrl.trim())
  ) {
    return "incomplete" as const;
  }

  return "active" as const;
}
