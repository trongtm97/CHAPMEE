const EXTERNAL_URL_PATTERN =
  /^(https?:\/\/|mailto:|tel:|zalo:|javascript:)/i;

const BODY_MAX_LENGTH = 500;

export function validateCampaignBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return "Nội dung không được để trống.";
  }
  if (trimmed.length > BODY_MAX_LENGTH) {
    return `Nội dung không được quá ${BODY_MAX_LENGTH} ký tự.`;
  }
  if (EXTERNAL_URL_PATTERN.test(trimmed) || trimmed.includes("http://") || trimmed.includes("https://")) {
    return "Nội dung không được chứa liên kết ngoài nền tảng.";
  }
  return null;
}

export function validateCampaignName(name: string): string | null {
  if (!name.trim()) {
    return "Tên campaign nội bộ không được để trống.";
  }
  return null;
}

export function validateScheduledAt(value: string | null | undefined, sendNow: boolean): string | null {
  if (sendNow || !value?.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Thời gian lên lịch không hợp lệ.";
  }
  if (date.getTime() < Date.now() - 60_000) {
    return "Thời gian lên lịch không được ở quá khứ.";
  }
  return null;
}

export const ALL_USERS_CONFIRM_PHRASE = "GUI TAT CA";

export function validateAllUsersConfirmPhrase(phrase: string): boolean {
  const normalized = phrase.trim().toUpperCase().replace(/\s+/g, " ");
  return normalized === ALL_USERS_CONFIRM_PHRASE || normalized === "GUI TOAN HE THONG";
}
