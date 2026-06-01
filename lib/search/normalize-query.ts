import { normalizeVietnameseSlug } from "@/lib/seo/slug";

export function normalizeSearchText(value: string) {
  return normalizeVietnameseSlug(value.replace(/@/g, " "), 120)
    .replace(/-/g, " ")
    .trim();
}

export function normalizeSearchQuery(raw: string) {
  const trimmed = raw.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return {
    raw: trimmed,
    lowered: trimmed.toLowerCase(),
    folded: normalizeSearchText(withoutAt),
    usernameCandidate: withoutAt.trim().toLowerCase().replace(/\s+/g, "")
  };
}

export function tokenizeSearchQuery(query: string) {
  const folded = normalizeSearchText(query);
  return folded.split(/\s+/).filter((token) => token.length >= 2);
}

export function isBroadSearchQuery(query: string) {
  const tokens = tokenizeSearchQuery(query);
  return tokens.length >= 2 || query.trim().length >= 10;
}
