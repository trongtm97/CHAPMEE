export const EXTERNAL_CONTACT_ERROR =
  "Hồ sơ tác giả không được chứa liên hệ hoặc đường dẫn ngoài ChapMee.";

const KEYWORD_PATTERN =
  /\b(zalo|facebook|messenger|telegram|gmail|linktr\.ee|linktree|fb\.com|t\.me)\b/i;

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const URL_PATTERN = /(?:https?:\/\/|www\.)/i;

const DOMAIN_PATTERN =
  /\b[a-z0-9-]+\.(com|vn|net|org|io|me|link|ee|co|info|xyz)\b/i;

const VN_PHONE_PATTERN =
  /(?:\+?84|0)[\s.\-_()]*\d{2}[\s.\-_()]*\d{3}[\s.\-_()]*\d{3,4}/;

export function validateNoExternalContact(text: string): {
  ok: boolean;
  error: string | null;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { error: null, ok: true };
  }

  const lower = trimmed.toLowerCase();

  if (URL_PATTERN.test(trimmed) || DOMAIN_PATTERN.test(trimmed)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  if (VN_PHONE_PATTERN.test(trimmed)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  const digitsOnly = lower.replace(/[\s.\-_()+]/g, "");
  if (/^(?:\+?84|0)\d{9,10}$/.test(digitsOnly)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  if (KEYWORD_PATTERN.test(lower)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  if (/\b(sđt|sdt|phone|liên hệ|lien he|inbox|\bib\b)\b/i.test(lower)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  if (/\bemail\b/i.test(lower) && EMAIL_PATTERN.test(trimmed)) {
    return { error: EXTERNAL_CONTACT_ERROR, ok: false };
  }

  return { error: null, ok: true };
}
