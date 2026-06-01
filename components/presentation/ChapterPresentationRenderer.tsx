"use client";

import { useMemo } from "react";
import { CaseFileRenderer } from "@/components/presentation/CaseFileRenderer";
import { ChatStoryRenderer } from "@/components/presentation/ChatStoryRenderer";
import { DiaryRenderer } from "@/components/presentation/DiaryRenderer";
import { PresentationFallbackNotice } from "@/components/presentation/PresentationFallbackNotice";
import { StandardProseRenderer } from "@/components/presentation/StandardProseRenderer";
import { MixedMediaRenderer } from "@/components/presentation/MixedMediaRenderer";
import { ScriptRenderer } from "@/components/presentation/ScriptRenderer";
import { SocialFeedRenderer } from "@/components/presentation/SocialFeedRenderer";
import { SystemGameRenderer } from "@/components/presentation/SystemGameRenderer";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import { resolveStructuredForRenderer } from "@/lib/composer/adapters/to-legacy-presentation";
import { modeUsesStructuredContent } from "@/lib/presentation/constants";
import { parseStructuredContentForMode } from "@/lib/presentation/parse-structured";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import type { PresentationMode } from "@/types/presentation";

export type ChapterPresentationRendererProps = {
  mode: PresentationMode;
  storyMode?: string | null;
  chapterMode?: string | null;
  content: string;
  structuredContent: unknown | null;
  showFallbackNotice?: boolean;
};

export function ChapterPresentationRenderer({
  chapterMode,
  content,
  mode,
  showFallbackNotice = true,
  storyMode,
  structuredContent
}: ChapterPresentationRendererProps) {
  const effectiveMode = resolveEffectivePresentationMode({
    chapterMode: chapterMode ?? mode,
    storyMode
  });

  const resolved = useMemo(() => {
    if (!modeUsesStructuredContent(effectiveMode)) {
      return { kind: "prose" as const };
    }

    if (structuredContent === null || structuredContent === undefined) {
      return {
        kind: "fallback" as const,
        reason: "Chưa có nội dung cấu trúc — hiển thị bản văn xuôi."
      };
    }

    let payload = structuredContent;
    if (isComposerStructuredDocument(structuredContent)) {
      const normalized = resolveStructuredForRenderer(
        effectiveMode,
        structuredContent,
        content
      );
      if (normalized.structuredContent == null) {
        return { kind: "prose" as const };
      }
      payload = normalized.structuredContent as NonNullable<typeof normalized.structuredContent>;
    }

    const parsed = parseStructuredContentForMode(effectiveMode, payload);
    if (!parsed.ok) {
      return { kind: "fallback" as const, reason: parsed.error };
    }

    return { kind: "structured" as const, mode: effectiveMode, data: parsed.data };
  }, [content, effectiveMode, structuredContent]);

  if (resolved.kind === "structured") {
    switch (resolved.mode) {
      case "chat_story":
        return <ChatStoryRenderer data={resolved.data as import("@/types/presentation").ChatStoryStructuredContent} />;
      case "case_file":
        return (
          <CaseFileRenderer
            data={resolved.data as import("@/types/presentation").CaseFileStructuredContent}
          />
        );
      case "diary":
        return <DiaryRenderer data={resolved.data as import("@/types/presentation").DiaryStructuredContent} />;
      case "system_game":
        return (
          <SystemGameRenderer
            data={resolved.data as import("@/types/presentation").SystemGameStructuredContent}
          />
        );
      case "social_feed":
        return (
          <SocialFeedRenderer
            data={resolved.data as import("@/types/presentation").SocialFeedStructuredContent}
          />
        );
      case "script":
        return (
          <ScriptRenderer
            data={resolved.data as import("@/types/presentation").ScriptStructuredContent}
          />
        );
      case "mixed_media":
        return (
          <MixedMediaRenderer
            data={resolved.data as import("@/types/presentation").MixedMediaStructuredContent}
          />
        );
      default:
        break;
    }
  }

  if (resolved.kind === "fallback" && showFallbackNotice) {
    return (
      <>
        <PresentationFallbackNotice message={resolved.reason} />
        <StandardProseRenderer content={content} />
      </>
    );
  }

  return <StandardProseRenderer content={content} />;
}
