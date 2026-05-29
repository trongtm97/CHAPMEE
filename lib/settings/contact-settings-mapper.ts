import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_CONTACT_SETTINGS_DB
} from "@/lib/settings/default-contact-settings";
import type { ContactSettings, ContactSettingsDb } from "@/types/contact-settings";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function parseContactSettingsDb(
  value: unknown
): ContactSettingsDb {
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
    facebook_url: asString(raw.facebook_url, DEFAULT_CONTACT_SETTINGS_DB.facebook_url),
    enable_facebook: asBoolean(
      raw.enable_facebook,
      DEFAULT_CONTACT_SETTINGS_DB.enable_facebook
    ),
    telegram_url: asString(raw.telegram_url, DEFAULT_CONTACT_SETTINGS_DB.telegram_url),
    enable_telegram: asBoolean(
      raw.enable_telegram,
      DEFAULT_CONTACT_SETTINGS_DB.enable_telegram
    ),
    enable_feedback_form: asBoolean(
      raw.enable_feedback_form,
      DEFAULT_CONTACT_SETTINGS_DB.enable_feedback_form
    ),
    contact_title: asString(raw.contact_title, DEFAULT_CONTACT_SETTINGS_DB.contact_title),
    contact_description: asString(
      raw.contact_description,
      DEFAULT_CONTACT_SETTINGS_DB.contact_description
    )
  };
}

export function toContactSettings(db: ContactSettingsDb): ContactSettings {
  return {
    supportEmail: db.support_email.trim(),
    enableSupportEmail: db.enable_support_email,
    facebookUrl: db.facebook_url.trim(),
    enableFacebook: db.enable_facebook,
    telegramUrl: db.telegram_url.trim(),
    enableTelegram: db.enable_telegram,
    enableFeedbackForm: db.enable_feedback_form,
    contactTitle: db.contact_title.trim() || DEFAULT_CONTACT_SETTINGS.contactTitle,
    contactDescription:
      db.contact_description.trim() || DEFAULT_CONTACT_SETTINGS.contactDescription
  };
}

export function toContactSettingsDb(settings: ContactSettings): ContactSettingsDb {
  return {
    support_email: settings.supportEmail.trim(),
    enable_support_email: settings.enableSupportEmail,
    facebook_url: settings.facebookUrl.trim(),
    enable_facebook: settings.enableFacebook,
    telegram_url: settings.telegramUrl.trim(),
    enable_telegram: settings.enableTelegram,
    enable_feedback_form: settings.enableFeedbackForm,
    contact_title: settings.contactTitle.trim(),
    contact_description: settings.contactDescription.trim()
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
  return settings.enableFeedbackForm;
}

export function hasVisibleContactChannel(settings: ContactSettings) {
  return (
    isSupportEmailVisible(settings) ||
    isFacebookVisible(settings) ||
    isTelegramVisible(settings) ||
    isFeedbackFormVisible(settings)
  );
}
