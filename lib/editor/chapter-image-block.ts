import { containsForbiddenLocalMediaUrl, resolveStoredMediaUrl } from "@/lib/media/media-url";
import type { ChapterImageBlock } from "@/types/chapter-images";

const IMAGE_BLOCK_REGEX = /\[\[chapmee-image\s+(\{[\s\S]*?\})\s*\]\]/g;

function normalizeAlign(value: unknown): "left" | "center" | "right" {
  return value === "left" || value === "right" ? value : "center";
}

export function buildChapterImageBlockToken(block: ChapterImageBlock) {
  return `[[chapmee-image ${JSON.stringify({
    align: normalizeAlign(block.align),
    alt: block.alt,
    caption: block.caption,
    height: block.height,
    id: block.id,
    mediaAssetId: block.mediaAssetId ?? block.id,
    src: block.src,
    thumbSrc: block.thumbSrc,
    width: block.width
  })}]]`;
}

export function parseChapterImageBlockToken(
  line: string
): ChapterImageBlock | null {
  const match = /^\[\[chapmee-image\s+(\{[\s\S]*\})\s*\]\]$/.exec(line.trim());

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<ChapterImageBlock>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.src !== "string" ||
      typeof parsed.thumbSrc !== "string" ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return null;
    }

    if (
      containsForbiddenLocalMediaUrl(parsed.src) ||
      containsForbiddenLocalMediaUrl(parsed.thumbSrc)
    ) {
      return null;
    }

    if (!isAllowedChapterImageSrc(parsed.src) || !isAllowedChapterImageSrc(parsed.thumbSrc)) {
      return null;
    }

    return {
      align: normalizeAlign(parsed.align),
      alt: typeof parsed.alt === "string" ? parsed.alt : "",
      caption: typeof parsed.caption === "string" ? parsed.caption : "",
      height: parsed.height,
      id: parsed.id,
      mediaAssetId: parsed.mediaAssetId ?? parsed.id,
      src: resolveStoredMediaUrl(parsed.src) ?? parsed.src,
      thumbSrc: resolveStoredMediaUrl(parsed.thumbSrc) ?? parsed.thumbSrc,
      width: parsed.width
    };
  } catch {
    return null;
  }
}

export function isAllowedChapterImageSrc(src: string) {
  if (containsForbiddenLocalMediaUrl(src)) {
    return false;
  }

  if (!src.startsWith("http://") && !src.startsWith("https://")) {
    return src.includes("/");
  }

  try {
    const url = new URL(src);
    const allowedMarkers = [
      "/chapter-media/",
      "/chapter-images/",
      "/content-posts/",
      "/composer-images/",
      "/story-images/",
      "/avatars/",
      "/temp/",
      "/storage/v1/object/public/"
    ];
    return allowedMarkers.some((marker) => url.pathname.includes(marker));
  } catch {
    return false;
  }
}

export function countImageBlocksInContent(content: string) {
  return [...content.matchAll(IMAGE_BLOCK_REGEX)].length;
}

export type ChapterContentSegment =
  | { type: "image"; block: ChapterImageBlock }
  | { type: "text"; lines: string[] };

export function splitChapterContent(content: string): ChapterContentSegment[] {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]*\n/g, "\n\n");
  const parts = normalized.split(/\n{2,}/);
  const segments: ChapterContentSegment[] = [];

  for (const part of parts) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const imageBlock = parseChapterImageBlockToken(trimmed);

    if (imageBlock) {
      segments.push({ block: imageBlock, type: "image" });
      continue;
    }

    segments.push({
      lines: trimmed.split("\n"),
      type: "text"
    });
  }

  return segments;
}

export function insertChapterImageBlockAtCursor(input: {
  content: string;
  selectionEnd: number;
  selectionStart: number;
  token: string;
}) {
  const before = input.content.slice(0, input.selectionStart);
  const after = input.content.slice(input.selectionEnd);
  const prefix = before.length > 0 && !before.endsWith("\n\n") ? "\n\n" : "";
  const suffix = after.length > 0 && !after.startsWith("\n\n") ? "\n\n" : "";

  return `${before}${prefix}${input.token}${suffix}${after}`;
}
