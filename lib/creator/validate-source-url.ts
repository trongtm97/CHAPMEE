/** Clean http(s) URL — no whitespace, valid host, optional path/query without junk. */
const CLEAN_SOURCE_URL_REGEX =
  /^https?:\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/;

export function normalizeSourceUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (!url.hostname || url.hostname.includes("..")) {
      return null;
    }

    const normalized = url.href.replace(/\/$/, "");
    if (!CLEAN_SOURCE_URL_REGEX.test(normalized)) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

export function isValidSourceUrl(raw: string): boolean {
  return normalizeSourceUrl(raw) !== null;
}

export const SOURCE_URL_VALIDATION_MESSAGE =
  "Nhập link nguồn hợp lệ (http/https, không khoảng trắng, ví dụ: https://example.com/truyen).";
