"use client";

import { useMemo } from "react";
import { ChapterPresentationRenderer } from "@/components/presentation/ChapterPresentationRenderer";
import { ComposerBlocksPublicRenderer } from "@/components/composer/renderers/ComposerBlocksPublicRenderer";
import { ComposerUnsupportedPlaceholder } from "@/components/composer/renderers/ComposerUnsupportedPlaceholder";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import { parseComposerDocument } from "@/lib/composer/serializer";
import {
  adaptComposerToLegacyPresentation,
  resolveStructuredForRenderer
} from "@/lib/composer/adapters/to-legacy-presentation";
import { composerModeToPresentationMode, presentationModeToComposerMode } from "@/lib/composer/modes";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import { shouldUseStructuredRenderer } from "@/lib/composer/compat";
import type { ComposerRenderContext } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

type ResolvedRenderPlan =
  | {
      kind: "legacy-renderer";
      structured: unknown | null;
      fallback: string;
      presentationMode?: PresentationMode;
    }
  | { kind: "prose-only"; fallback: string }
  | { kind: "unsupported"; message: string; fallback: string };

export type ChapMeeBlockRendererProps = {
  mode: PresentationMode | string;
  structuredContent: unknown | null;
  fallbackContent: string;
  contentFormat?: string | null;
  storyMode?: string | null;
  chapterMode?: string | null;
  context?: ComposerRenderContext;
  showFallbackNotice?: boolean;
  chapterImageMap?: ChapterImageMap;
};

/**
 * Central ChapMee Studio Composer renderer.
 * Adapts Composer v1 block documents to legacy T6 shapes, then delegates to T6 renderers.
 */
export function ChapMeeBlockRenderer({
  chapterMode,
  contentFormat = null,
  context = "public",
  fallbackContent,
  mode,
  showFallbackNotice = true,
  storyMode,
  structuredContent,
  chapterImageMap = {}
}: ChapMeeBlockRendererProps) {
  const composerMode = presentationModeToComposerMode(mode);

  const composerDocument = useMemo(() => {
    if (!isComposerStructuredDocument(structuredContent)) {
      return null;
    }
    const parsed = parseComposerDocument(structuredContent);
    return parsed.ok ? parsed.data : null;
  }, [structuredContent]);

  const resolved = useMemo((): ResolvedRenderPlan => {
    if (
      !shouldUseStructuredRenderer(contentFormat, structuredContent) &&
      !isComposerStructuredDocument(structuredContent)
    ) {
      return {
        kind: "legacy-renderer",
        structured: null,
        fallback: fallbackContent
      };
    }

    if (structuredContent == null) {
      return {
        kind: "legacy-renderer",
        structured: null,
        fallback: fallbackContent
      };
    }

    if (isComposerStructuredDocument(structuredContent)) {
      const adapted = adaptComposerToLegacyPresentation(structuredContent);
      if (adapted.kind === "legacy") {
        return {
          kind: "legacy-renderer",
          structured: adapted.data,
          fallback: fallbackContent,
          presentationMode: adapted.mode
        };
      }
      if (adapted.kind === "prose") {
        return {
          kind: "prose-only",
          fallback: adapted.text || fallbackContent
        };
      }
      return {
        kind: "unsupported",
        message: adapted.message,
        fallback: fallbackContent
      };
    }

    const normalized = resolveStructuredForRenderer(
      composerMode,
      structuredContent,
      fallbackContent
    );

    return {
      kind: "legacy-renderer",
      structured: normalized.structuredContent,
      fallback: normalized.fallbackContent
    };
  }, [composerMode, contentFormat, fallbackContent, structuredContent]);

  if (composerDocument) {
    return (
      <ComposerBlocksPublicRenderer
        doc={composerDocument}
        fallbackContent={fallbackContent}
        imageMap={chapterImageMap}
      />
    );
  }

  if (resolved.kind === "unsupported") {
    return (
      <ComposerUnsupportedPlaceholder
        fallbackContent={resolved.fallback}
        message={resolved.message}
      />
    );
  }

  if (resolved.kind === "prose-only") {
    return (
      <ChapterPresentationRenderer
        chapterMode={chapterMode}
        content={resolved.fallback}
        mode="standard_prose"
        showFallbackNotice={
          showFallbackNotice && context !== "admin"
        }
        storyMode={storyMode}
        structuredContent={null}
      />
    );
  }

  const presentationMode =
    resolved.presentationMode ??
    composerModeToPresentationMode(composerMode);

  return (
    <ChapterPresentationRenderer
      chapterMode={chapterMode}
      content={resolved.fallback}
      mode={presentationMode}
      showFallbackNotice={showFallbackNotice}
      storyMode={storyMode}
      structuredContent={resolved.structured}
    />
  );
}
