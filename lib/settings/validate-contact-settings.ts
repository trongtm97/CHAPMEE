import type {
  ContactSettings,
  ContactSettingsValidationErrors
} from "@/types/contact-settings";
import { ALL_FEEDBACK_TYPES } from "@/lib/feedback/constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FACEBOOK_PATTERN =
  /^https:\/\/(www\.)?facebook\.com\/.+/i;
const TELEGRAM_PATTERN = /^https:\/\/t\.me\/.+/i;

function isValidHttpUrl(value: string) {
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
      errors.supportEmail = "Vui lòng nhập email nếu đã bật kênh Email.";
    } else if (!EMAIL_PATTERN.test(settings.supportEmail.trim())) {
      errors.supportEmail = "Email hỗ trợ không hợp lệ.";
    }
  }

  if (settings.enableFacebook) {
    if (!settings.facebookUrl.trim()) {
      errors.facebookUrl = "Vui lòng nhập link Fanpage nếu đã bật Fanpage.";
    } else if (
      !FACEBOOK_PATTERN.test(settings.facebookUrl.trim()) ||
      !isValidHttpUrl(settings.facebookUrl.trim())
    ) {
      errors.facebookUrl =
        "Link Fanpage phải bắt đầu bằng https://facebook.com/ hoặc https://www.facebook.com/.";
    }
  }

  if (settings.enableTelegram) {
    if (!settings.telegramUrl.trim()) {
      errors.telegramUrl = "Vui lòng nhập link Telegram nếu đã bật Telegram.";
    } else if (
      !TELEGRAM_PATTERN.test(settings.telegramUrl.trim()) ||
      !isValidHttpUrl(settings.telegramUrl.trim())
    ) {
      errors.telegramUrl = "Link Telegram phải có dạng https://t.me/...";
    }
  }

  if (settings.contactTitle.length > 60) {
    errors.contactTitle = "Tiêu đề tối đa 60 ký tự.";
  }

  if (settings.contactDescription.length > 160) {
    errors.contactDescription = "Mô tả tối đa 160 ký tự.";
  }

  if (settings.enableFeedbackForm && settings.allowedFeedbackTypes.length === 0) {
    errors.allowedFeedbackTypes = "Chọn ít nhất một loại góp ý.";
  }

  if (settings.dailyLimitPerUser < 1 || settings.dailyLimitPerUser > 50) {
    errors.dailyLimitPerUser = "Giới hạn mỗi ngày phải từ 1 đến 50.";
  }

  if (settings.cooldownSeconds < 10 || settings.cooldownSeconds > 3600) {
    errors.cooldownSeconds = "Thời gian chờ phải từ 10 đến 3600 giây.";
  }

  if (
    !settings.enableSupportEmail &&
    !settings.enableFacebook &&
    !settings.enableTelegram &&
    !settings.enableFeedbackForm
  ) {
    errors.form =
      "Module Liên hệ & Góp ý sẽ bị ẩn ngoài app khi tất cả kênh đều tắt.";
  }

  return errors;
}

export function hasValidationErrors(errors: ContactSettingsValidationErrors) {
  return Object.keys(errors).some(
    (key) => key !== "form" && Boolean(errors[key as keyof ContactSettingsValidationErrors])
  );
}

export function isAllowedFeedbackType(type: string, settings: ContactSettings) {
  return settings.allowedFeedbackTypes.includes(
    type as (typeof ALL_FEEDBACK_TYPES)[number]
  );
}
