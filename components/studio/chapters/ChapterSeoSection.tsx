"use client";

import { SEOAssistantPanel } from "@/components/studio/SEOAssistantPanel";
import { buildChapterUrlPreview } from "@/lib/chapters/chapter-url-preview";

type ChapterSeoSectionProps = {
  authorDisplayName?: string | null;
  chapterIndexable: boolean;
  content: string;
  disabled?: boolean;
  episodeNumber: number;
  onSeoDescriptionChange: (value: string) => void;
  onSeoKeywordsChange: (keywords: string[]) => void;
  onSeoTitleChange: (value: string) => void;
  seoDescription: string;
  seoKeywords: string[];
  seoTitle: string;
  storyGenreName?: string | null;
  storyPublicCode?: string | null;
  storySlug: string;
  storyTagNames?: string[];
  storyTitle: string;
  title: string;
};

export function ChapterSeoSection({
  authorDisplayName,
  chapterIndexable,
  content,
  disabled = false,
  episodeNumber,
  onSeoDescriptionChange,
  onSeoKeywordsChange,
  onSeoTitleChange,
  seoDescription,
  seoKeywords,
  seoTitle,
  storyGenreName,
  storyPublicCode,
  storySlug,
  storyTagNames = [],
  storyTitle,
  title
}: ChapterSeoSectionProps) {
  const urlPreview = buildChapterUrlPreview({
    episodeNumber,
    storyPublicCode,
    storySlug
  });

  return (
    <details className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-300">
        SEO chương
      </summary>
      <div className="border-t border-white/10 p-4">
        <SEOAssistantPanel
          canonicalUrl={urlPreview.replace(/^chapmee\.vn/, "")}
          chapterContext={{
            authorName: authorDisplayName,
            content,
            episodeNumber,
            genreName: storyGenreName ?? null,
            storySlug,
            storyTitle,
            tagNames: storyTagNames,
            title
          }}
          compact
          disabled={disabled}
          episodeNumber={episodeNumber}
          isIndexable={chapterIndexable}
          keywords={seoKeywords}
          mode="chapter"
          onKeywordsChange={onSeoKeywordsChange}
          onSeoDescriptionChange={onSeoDescriptionChange}
          onSeoTitleChange={onSeoTitleChange}
          seoDescription={seoDescription}
          seoTitle={seoTitle}
          storyContext={{
            authorName: authorDisplayName,
            genreName: storyGenreName ?? null,
            tagNames: storyTagNames,
            title: storyTitle
          }}
          storySlug={storySlug}
        />
      </div>
    </details>
  );
}
