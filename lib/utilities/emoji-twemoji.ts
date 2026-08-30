const TWEMOJI_CDN_BASES = [
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/72x72",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.3/assets/72x72"
] as const;

/** Decode HTML entities + clean scrape artifacts from run.vn. */
export function normalizeEmojiString(value: string): string {
  let normalized = value
    .replace(/&zwj;/gi, "\u200D")
    .replace(/&#x200d;/gi, "\u200D")
    .replace(/&#8205;/g, "\u200D")
    .replace(/&amp;/g, "&");

  while (normalized.codePointAt(0) === 0xfe0f) {
    normalized = normalized.slice(1);
  }

  return normalized;
}

export function emojiCodePoints(emoji: string): number[] {
  const normalized = normalizeEmojiString(emoji);
  const points: number[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const point = normalized.codePointAt(index);
    if (point === undefined) continue;
    points.push(point);
    if (point > 0xffff) index += 1;
  }

  return points;
}

export function isFlagEmoji(emoji: string): boolean {
  const points = emojiCodePoints(emoji);
  return points.length >= 2 && points.every((point) => point >= 0x1f1e6 && point <= 0x1f1ff);
}

export function flagEmojiToIso(emoji: string): string | null {
  const points = emojiCodePoints(emoji);
  if (points.length !== 2) return null;
  if (!points.every((point) => point >= 0x1f1e6 && point <= 0x1f1ff)) return null;

  return String.fromCharCode(points[0] - 0x1f1e6 + 65, points[1] - 0x1f1e6 + 65).toLowerCase();
}

function twemojiFileName(points: number[]): string {
  return points.map((point) => point.toString(16)).join("-");
}

/** Candidate image URLs — Twemoji CDNs, then flagcdn for country flags. */
export function emojiToTwemojiSrcCandidates(emoji: string): string[] {
  const points = emojiCodePoints(emoji);
  if (points.length === 0) return [];

  const withoutFe0f = points.filter((point) => point !== 0xfe0f);
  const fileNames = [...new Set([twemojiFileName(withoutFe0f), twemojiFileName(points)].filter(Boolean))];

  const urls = TWEMOJI_CDN_BASES.flatMap((base) =>
    fileNames.map((name) => `${base}/${name}.png`)
  );

  const iso = flagEmojiToIso(emoji);
  if (iso) {
    urls.push(`https://flagcdn.com/w40/${iso}.png`);
  }

  return [...new Set(urls)];
}

export function emojiToTwemojiSrc(emoji: string): string {
  return emojiToTwemojiSrcCandidates(emoji)[0] ?? "";
}

export function emojiForClipboard(emoji: string): string {
  return normalizeEmojiString(emoji);
}
