import { normalizeSearchQuery, tokenizeSearchQuery } from "@/lib/search/normalize-query";

export type SearchScoringFields = {
  title: string;
  slug?: string | null;
  description?: string | null;
  tags?: string[];
  genreName?: string | null;
  genreSlug?: string | null;
  authorDisplayName?: string | null;
  authorUsername?: string | null;
  chapterTitle?: string | null;
  resultType: string;
};

function includesFolded(haystack: string, needle: string) {
  if (!needle) return false;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  return h.includes(n) || h.replace(/\s+/g, "").includes(n.replace(/\s+/g, ""));
}

function tokenCoverage(tokens: string[], fields: string[]) {
  if (tokens.length === 0) return 0;
  const corpus = fields.join(" ").toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (corpus.includes(token)) hits += 1;
  }
  return hits / tokens.length;
}

export function calculateExactMatchScore(query: string, item: SearchScoringFields) {
  const q = normalizeSearchQuery(query);
  const titleFolded = item.title.trim().toLowerCase();
  const slugFolded = (item.slug ?? "").trim().toLowerCase();
  const username = (item.authorUsername ?? "").trim().toLowerCase();

  if (username && (q.usernameCandidate === username || q.lowered === `@${username}`)) {
    return 1;
  }

  if (
    item.authorDisplayName &&
    item.resultType === "author" &&
    item.authorDisplayName.trim().toLowerCase() === q.lowered
  ) {
    return 0.98;
  }

  if (titleFolded === q.lowered || slugFolded === q.usernameCandidate) {
    return 0.98;
  }

  if (q.folded && (titleFolded === q.folded || slugFolded.replace(/-/g, " ") === q.folded)) {
    return 0.95;
  }

  if (includesFolded(item.title, q.raw) && q.raw.length >= 4) {
    return 0.88;
  }

  if (item.chapterTitle && includesFolded(item.chapterTitle, q.raw)) {
    return 0.82;
  }

  return 0;
}

export function calculateTextRelevance(query: string, item: SearchScoringFields) {
  const q = normalizeSearchQuery(query);
  const tokens = tokenizeSearchQuery(query);
  const fields = [
    item.title,
    item.slug ?? "",
    item.description ?? "",
    item.chapterTitle ?? "",
    item.genreName ?? "",
    item.genreSlug ?? "",
    item.authorDisplayName ?? "",
    item.authorUsername ?? "",
    ...(item.tags ?? [])
  ].filter(Boolean);

  let score = 0;

  if (includesFolded(item.title, q.raw)) score += 0.42;
  if (item.slug && includesFolded(item.slug, q.raw)) score += 0.18;
  if (item.description && includesFolded(item.description, q.raw)) score += 0.12;
  if (item.chapterTitle && includesFolded(item.chapterTitle, q.raw)) score += 0.14;
  if (item.authorDisplayName && includesFolded(item.authorDisplayName, q.raw)) score += 0.1;
  if (item.authorUsername && includesFolded(item.authorUsername, q.raw)) score += 0.12;

  for (const tag of item.tags ?? []) {
    if (includesFolded(tag, q.raw)) score += 0.06;
  }

  if (item.genreName && includesFolded(item.genreName, q.raw)) score += 0.08;

  score += tokenCoverage(tokens, fields) * 0.25;

  return Math.min(1, score);
}
