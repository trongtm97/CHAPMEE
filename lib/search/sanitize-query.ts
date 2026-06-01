const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_PATTERN = /\b\d{9,12}\b/;
const LONG_TOKEN_PATTERN = /\b[a-z0-9]{32,}\b/i;

export function isSafeSearchQueryForLogging(query: string) {
  const normalized = query.trim();
  if (!normalized) return false;
  if (normalized.length > 120) return false;
  if (EMAIL_PATTERN.test(normalized)) return false;
  if (PHONE_PATTERN.test(normalized)) return false;
  if (LONG_TOKEN_PATTERN.test(normalized)) return false;
  return true;
}

export function sanitizeSearchQueryForMetadata(query: string) {
  if (!isSafeSearchQueryForLogging(query)) {
    return null;
  }
  return query.trim().slice(0, 80);
}
