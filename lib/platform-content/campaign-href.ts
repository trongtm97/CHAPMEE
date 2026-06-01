export function validateCampaignInternalHref(href: string | null | undefined): string | null {
  if (!href?.trim()) {
    return null;
  }

  const value = href.trim();

  if (!value.startsWith("/")) {
    return "Link phải là đường dẫn nội bộ bắt đầu bằng /.";
  }

  if (value.startsWith("//")) {
    return "Không được dùng link ngoài nền tảng.";
  }

  if (/^https?:\/\//i.test(value)) {
    return "Không được dùng link ngoài nền tảng.";
  }

  return null;
}

export function normalizeCampaignInternalHref(href: string | null | undefined) {
  const trimmed = href?.trim();
  if (!trimmed) {
    return null;
  }

  const error = validateCampaignInternalHref(trimmed);
  if (error) {
    return null;
  }

  return trimmed;
}

export function sanitizeUserNotificationHref(href: string | null | undefined) {
  if (!href) {
    return null;
  }

  return validateCampaignInternalHref(href) ? null : href;
}
