export type SpamMetadata = {
  title?: string | null;
  content?: string | null;
  userRecentCount?: number | null;
  recentSameContentCount?: number | null;
};

export type SpamAssessment = {
  suspected: boolean;
  score: number;
  reasons: string[];
};

const spamWords = ["buy now", "click here", "free money", "telegram", "whatsapp", "casino", "เครดิตฟรี"];

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length;
}

export function detectPotentialSpamContent(metadata: SpamMetadata): SpamAssessment {
  const title = (metadata.title ?? "").trim();
  const content = (metadata.content ?? "").trim();
  const text = `${title}\n${content}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (text.length < 20) {
    score += 2;
    reasons.push("too_short");
  }

  if (countMatches(text, /(https?:\/\/|www\.|t\.me\/|bit\.ly\/)/g) > 1) {
    score += 3;
    reasons.push("too_many_links");
  }

  if (countMatches(text, /(.)\1{5,}/g) > 0) {
    score += 2;
    reasons.push("repeated_chars");
  }

  if (countMatches(text, /[!?]{3,}|[.]{4,}/g) > 0) {
    score += 1;
    reasons.push("punctuation_spam");
  }

  if (countMatches(text, /[\p{Extended_Pictographic}]/gu) > 12) {
    score += 2;
    reasons.push("emoji_overload");
  }

  if (spamWords.some((word) => text.includes(word))) {
    score += 3;
    reasons.push("spam_keyword");
  }

  if ((metadata.recentSameContentCount ?? 0) >= 2) {
    score += 3;
    reasons.push("duplicate_content");
  }

  if ((metadata.userRecentCount ?? 0) >= 5) {
    score += 2;
    reasons.push("high_frequency");
  }

  return { suspected: score >= 3, score, reasons };
}
