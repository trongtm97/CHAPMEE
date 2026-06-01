"use client";

import { ChapMeeBlockRenderer } from "@/components/composer/renderers/ChapMeeBlockRenderer";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type StandaloneStoryReaderProps = {
  story: StoryDetail;
};

export function StandaloneStoryReader({ story }: StandaloneStoryReaderProps) {
  const presentationMode = story.contentFormat ?? "standard_prose";

  return (
    <ReaderPreferencesProvider>
      <article className="mx-auto max-w-2xl space-y-6 py-6">
        <ChapMeeBlockRenderer
          chapterMode={presentationMode}
          contentFormat="structured_blocks"
          context="public"
          fallbackContent={story.standalonePlainText ?? ""}
          mode={presentationMode}
          storyMode={presentationMode}
          structuredContent={story.standaloneContentJson}
        />
      </article>
    </ReaderPreferencesProvider>
  );
}
