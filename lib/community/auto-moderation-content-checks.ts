import type { ModerationKeywordRule } from "@/types/community-auto-moderation";

export type ContentCheckResult = {
  hasBlockedKeyword: boolean;
  hasHighSeverityBlock: boolean;
  hasReviewKeyword: boolean;
  hasExternalLink: boolean;
  externalLinkAllowed: boolean;
  isDuplicate: boolean;
  spamPatterns: string[];
};

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function keywordMatches(
  text: string,
  rule: Pick<ModerationKeywordRule, "keyword" | "matchType">
) {
  const hay = normalizeText(text);
  const needle = normalizeText(rule.keyword);
  if (!needle) return false;
  if (rule.matchType === "exact") return hay === needle;
  if (rule.matchType === "starts_with") return hay.startsWith(needle);
  return hay.includes(needle);
}

export function extractUrls(text: string) {
  return [...text.matchAll(URL_REGEX)].map((m) => m[0].toLowerCase());
}

export function isDomainAllowed(url: string, allowedDomains: string[]) {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
    return allowedDomains.some((d) => {
      const domain = d.toLowerCase().replace(/^www\./, "");
      return host === domain || host.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

export function runKeywordChecks(
  title: string,
  content: string,
  rules: ModerationKeywordRule[]
) {
  const combined = `${title}\n${content}`;
  let hasBlockedKeyword = false;
  let hasHighSeverityBlock = false;
  let hasReviewKeyword = false;

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (!keywordMatches(combined, rule)) continue;

    if (rule.action === "allow") continue;
    if (rule.action === "block") {
      hasBlockedKeyword = true;
      if (rule.severity === "high") hasHighSeverityBlock = true;
    }
    if (rule.action === "review") {
      hasReviewKeyword = true;
    }
  }

  return { hasBlockedKeyword, hasHighSeverityBlock, hasReviewKeyword };
}

export function detectSpamPatterns(title: string, content: string) {
  const patterns: string[] = [];
  const combined = `${title} ${content}`;

  if (combined.replace(/[^\p{L}\p{N}]/gu, "").length < 3) {
    patterns.push("almost_no_letters");
  }

  const upperRatio =
    (combined.replace(/[^A-ZÀ-Ỹ]/g, "").length || 0) /
    Math.max(combined.replace(/\s/g, "").length, 1);
  if (upperRatio > 0.6 && combined.length > 20) {
    patterns.push("excessive_caps");
  }

  if (/(.)\1{5,}/.test(combined)) {
    patterns.push("repeated_chars");
  }

  const emojiCount = (combined.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []).length;
  if (emojiCount > 15) {
    patterns.push("excessive_emoji");
  }

  const urls = extractUrls(combined);
  if (urls.length > 3) {
    patterns.push("too_many_links");
  }

  return patterns;
}

export function checkExternalLinks(
  text: string,
  allowedDomains: string[],
  allowForUser: boolean
) {
  const urls = extractUrls(text);
  if (!urls.length) {
    return { hasExternalLink: false, externalLinkAllowed: true };
  }

  const allAllowed = urls.every((u) => isDomainAllowed(u, allowedDomains));
  return {
    hasExternalLink: true,
    externalLinkAllowed: allowForUser && allAllowed
  };
}

export async function checkDuplicateContent(
  db: Awaited<ReturnType<typeof import("@/lib/data/server").createClient>>,
  userId: string,
  title: string,
  content: string
) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const normalized = normalizeText(`${title} ${content}`);

  const { data } = await db
    .from("community_posts")
    .select("title, content")
    .eq("user_id", userId)
    .gte("created_at", since)
    .limit(20);

  for (const row of data ?? []) {
    const prev = normalizeText(`${row.title} ${row.content}`);
    if (prev === normalized) return true;
    if (prev.length > 40 && normalized.length > 40) {
      if (prev.includes(normalized) || normalized.includes(prev)) return true;
    }
  }

  return false;
}
