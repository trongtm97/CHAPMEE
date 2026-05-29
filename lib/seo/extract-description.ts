import { createExcerpt } from "@/lib/text/createExcerpt";

const IMAGE_TOKEN_REGEX = /\[\[chapmee-image[\s\S]*?\]\]/g;

/** Loại bỏ HTML, markdown nhẹ và token ảnh — chỉ giữ plain text. */
export function stripContentForSEO(value: string) {
  let output = value
    .replace(/\r\n/g, "\n")
    .replace(IMAGE_TOKEN_REGEX, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/_/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/---/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return output;
}

export function extractLeadingSentences(value: string, maxSentences = 2) {
  const plain = stripContentForSEO(value);

  if (!plain) {
    return "";
  }

  const parts = plain.split(/(?<=[.!?…])\s+/).filter(Boolean);

  return parts.slice(0, maxSentences).join(" ").trim();
}

export function trimSeoDescription(
  value: string,
  maxLength = 160,
  minLength = 80
) {
  const text = stripContentForSEO(value);

  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");

  const trimmed =
    lastSpace > minLength ? slice.slice(0, lastSpace) : slice.trimEnd();

  return `${trimmed}…`;
}

export function trimSeoTitle(value: string, maxLength = 60) {
  const text = stripContentForSEO(value);

  if (text.length <= maxLength) {
    return text;
  }

  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.5) {
    return `${slice.slice(0, lastSpace)}…`;
  }

  return `${slice.trimEnd()}…`;
}

export function pickStoryDescriptionSource(input: {
  hook?: string | null;
  longDescription?: string | null;
  shortDescription?: string | null;
}) {
  const combined = [input.shortDescription, input.longDescription, input.hook]
    .map((part) => stripContentForSEO(part ?? ""))
    .filter(Boolean)
    .join(" ");

  return combined;
}

export function excerptForSeo(content: string, maxChars = 320) {
  return stripContentForSEO(createExcerpt(content, 20, maxChars));
}
