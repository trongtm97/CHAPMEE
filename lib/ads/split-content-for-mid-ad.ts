import { isComposerStructuredDocument, parseComposerDocument } from "@/lib/composer/serializer";
import type { ComposerStructuredContent } from "@/lib/composer/types";

/** Target ~40% through content (within 35–45% UX band). */
const MID_AD_RATIO = 0.4;

export type ProseMidSplit = {
  kind: "prose";
  firstContent: string;
  secondContent: string;
};

export type ComposerMidSplit = {
  kind: "composer";
  firstDoc: ComposerStructuredContent;
  secondDoc: ComposerStructuredContent;
};

export type MidContentSplit = ProseMidSplit | ComposerMidSplit | null;

function clampSplitIndex(total: number, minGap: number): number | null {
  if (total < minGap) {
    return null;
  }
  let splitAt = Math.max(minGap, Math.floor(total * MID_AD_RATIO));
  splitAt = Math.min(splitAt, total - 2);
  if (splitAt < 1 || splitAt >= total - 1) {
    return null;
  }
  return splitAt;
}

export function splitProseForMidAd(content: string, minGap: number): MidContentSplit {
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 2) {
    return null;
  }

  const splitAt = clampSplitIndex(paragraphs.length, Math.max(2, minGap));
  if (splitAt == null) {
    return null;
  }

  return {
    kind: "prose",
    firstContent: paragraphs.slice(0, splitAt).join("\n\n"),
    secondContent: paragraphs.slice(splitAt).join("\n\n")
  };
}

export function splitComposerForMidAd(
  structuredContent: unknown,
  minGap: number
): MidContentSplit {
  if (!isComposerStructuredDocument(structuredContent)) {
    return null;
  }

  const parsed = parseComposerDocument(structuredContent);
  if (!parsed.ok || !parsed.data.blocks?.length) {
    return null;
  }

  const blocks = parsed.data.blocks;
  const splitAt = clampSplitIndex(blocks.length, Math.max(3, minGap));
  if (splitAt == null) {
    return null;
  }

  const meta = parsed.data.metadata ?? { characters: [], warnings: [], composer_version: 1 };

  return {
    kind: "composer",
    firstDoc: {
      version: parsed.data.version,
      mode: parsed.data.mode,
      blocks: blocks.slice(0, splitAt),
      metadata: meta
    },
    secondDoc: {
      version: parsed.data.version,
      mode: parsed.data.mode,
      blocks: blocks.slice(splitAt),
      metadata: meta
    }
  };
}

export function resolveMidContentSplit(input: {
  content: string;
  structuredContent: unknown | null;
  contentFormat?: string | null;
  minGap: number;
}): MidContentSplit {
  const useComposer =
    input.contentFormat === "composer_v1" ||
    input.contentFormat === "structured_blocks" ||
    isComposerStructuredDocument(input.structuredContent);

  if (useComposer && input.structuredContent) {
    const composerSplit = splitComposerForMidAd(input.structuredContent, input.minGap);
    if (composerSplit) {
      return composerSplit;
    }
  }

  return splitProseForMidAd(input.content, input.minGap);
}
