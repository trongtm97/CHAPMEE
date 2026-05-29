import type {
  ContactSettings,
  ContactSettingsValidationErrors
} from "@/types/contact-settings";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateContactSettings(
  settings: ContactSettings
): ContactSettingsValidationErrors {
  const errors: ContactSettingsValidationErrors = {};

  if (settings.enableSupportEmail) {
    if (!settings.supportEmail.trim()) {
      errors.supportEmail = "Vui lòng nhập Email nếu đã bật kênh Email.";
    } else if (!EMAIL_PATTERN.test(settings.supportEmail.trim())) {
      errors.supportEmail = "Email hỗ trợ không hợp lệ.";
    }
  }

  if (settings.enableFacebook) {
    if (!settings.facebookUrl.trim()) {
      errors.facebookUrl = "Vui lòng nhập link Fanpage nếu đã bật Fanpage.";
    } else if (!isValidUrl(settings.facebookUrl.trim())) {
      errors.facebookUrl = "Link Fanpage không hợp lệ.";
    }
  }

  if (settings.enableTelegram) {
    if (!settings.telegramUrl.trim()) {
      errors.telegramUrl = "Vui lòng nhập link Telegram nếu đã bật Telegram.";
    } else if (!isValidUrl(settings.telegramUrl.trim())) {
      errors.telegramUrl = "Link Telegram không hợp lệ.";
    }
  }

  if (settings.contactTitle.length > 60) {
    errors.contactTitle = "Tiêu đề tối đa 60 ký tự.";
  }

  if (settings.contactDescription.length > 160) {
    errors.contactDescription = "Mô tả tối đa 160 ký tự.";
  }

  return errors;
}

export function hasValidationErrors(errors: ContactSettingsValidationErrors) {
  return Object.keys(errors).length > 0;
}
