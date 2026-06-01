import { createBlock } from "@/lib/composer/blocks";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import { createEmptyMetadata, COMPOSER_SCHEMA_VERSION } from "@/lib/composer/schema";
import { getDefaultTemplateForMode } from "@/lib/composer/templates";
import type {
  ComposerBlockUnion,
  ComposerBlockType,
  ComposerMode,
  ComposerStructuredContent
} from "@/lib/composer/types";

export { createEmptyStructuredContent } from "@/lib/composer/templates";
export {
  createBlock,
  getBlockTypeDescription,
  getBlockTypeLabel,
  getComposerModeLabel,
  duplicateBlock
} from "@/lib/composer/blocks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceComposerDocumentRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const version = raw.version;
  const versionOk =
    version === COMPOSER_SCHEMA_VERSION ||
    version === 1 ||
    version === "1";

  return {
    ...raw,
    version: versionOk ? COMPOSER_SCHEMA_VERSION : COMPOSER_SCHEMA_VERSION,
    mode: typeof raw.mode === "string" ? raw.mode : "standard_prose",
    blocks: Array.isArray(raw.blocks) ? raw.blocks : []
  };
}

function unwrapComposerJson(raw: unknown): unknown {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

export function isComposerStructuredDocument(
  raw: unknown
): raw is ComposerStructuredContent {
  const unwrapped = unwrapComposerJson(raw);
  if (!isRecord(unwrapped)) {
    return false;
  }
  const version = unwrapped.version;
  const versionOk =
    version === COMPOSER_SCHEMA_VERSION ||
    version === 1 ||
    version === "1";
  return (
    versionOk &&
    typeof unwrapped.mode === "string" &&
    Array.isArray(unwrapped.blocks)
  );
}

/** Parse structured_content từ DB/draft — chấp nhận JSON string và version lỏng. */
export function tryParseStoredComposerDocument(
  raw: unknown
): { ok: true; data: ComposerStructuredContent } | { ok: false; error: string } {
  const unwrapped = unwrapComposerJson(raw);
  if (!isRecord(unwrapped)) {
    return { ok: false, error: "Không phải tài liệu Composer (thiếu mode/blocks)." };
  }
  return parseComposerDocument(coerceComposerDocumentRecord(unwrapped));
}

export function parseComposerDocument(
  raw: unknown
): { ok: true; data: ComposerStructuredContent } | { ok: false; error: string } {
  if (!isComposerStructuredDocument(raw)) {
    return { ok: false, error: "Không phải tài liệu Composer v1 (version/mode/blocks)." };
  }

  const blocks: ComposerBlockUnion[] = [];
  for (const item of raw.blocks) {
    if (!isRecord(item) || typeof item.type !== "string" || typeof item.id !== "string") {
      continue;
    }
    blocks.push({
      id: item.id,
      type: item.type as ComposerBlockType,
      order: typeof item.order === "number" ? item.order : blocks.length + 1,
      data: isRecord(item.data) ? item.data : {}
    } as ComposerBlockUnion);
  }

  const metadata = isRecord(raw.metadata)
    ? {
        characters: Array.isArray(raw.metadata.characters)
          ? (raw.metadata.characters as ComposerStructuredContent["metadata"]["characters"])
          : [],
        warnings: Array.isArray(raw.metadata.warnings)
          ? raw.metadata.warnings.filter((w): w is string => typeof w === "string")
          : [],
        composer_version:
          typeof raw.metadata.composer_version === "number"
            ? raw.metadata.composer_version
            : COMPOSER_SCHEMA_VERSION
      }
    : createEmptyMetadata();

  return {
    ok: true,
    data: {
      version: COMPOSER_SCHEMA_VERSION,
      mode: presentationModeToComposerMode(raw.mode),
      blocks: normalizeBlockOrder(blocks),
      metadata
    }
  };
}

export function normalizeBlockOrder(blocks: ComposerBlockUnion[]): ComposerBlockUnion[] {
  return [...blocks]
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({
      ...block,
      order: index + 1
    }));
}

export function moveBlock(
  blocks: ComposerBlockUnion[],
  fromIndex: number,
  toIndex: number
): ComposerBlockUnion[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex >= blocks.length ||
    fromIndex === toIndex
  ) {
    return normalizeBlockOrder(blocks);
  }

  const copy = [...blocks];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return normalizeBlockOrder(copy);
}

export function convertRichTextToProseBlocks(content: string): ComposerBlockUnion[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  const paragraphs = trimmed.split(/\n{2,}/);
  return paragraphs.map((text, index) =>
    createBlock("prose", { text: text.trim() }, index + 1)
  );
}

export function composerDocumentToJson(doc: ComposerStructuredContent): string {
  return JSON.stringify(doc, null, 2);
}

export function legacyContentToProseDocument(
  content: string,
  mode?: ComposerMode
): ComposerStructuredContent {
  const composerMode = mode ?? "standard_prose";
  const blocks = convertRichTextToProseBlocks(content);
  if (blocks.length === 0) {
    return getDefaultTemplateForMode(composerMode);
  }

  return {
    version: COMPOSER_SCHEMA_VERSION,
    mode: composerMode,
    blocks: normalizeBlockOrder(blocks),
    metadata: createEmptyMetadata()
  };
}

export function isStructuredContentFormat(
  format: string | null | undefined
): boolean {
  return format === "structured_json" || format === "structured_blocks";
}
