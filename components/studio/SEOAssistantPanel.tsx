"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { SEOPreview } from "@/components/studio/SEOPreview";
import { generateChapterSEO } from "@/lib/seo/generate-chapter-seo";
import { generateStorySEO } from "@/lib/seo/generate-story-seo";
import {
  buildChapterSEOChecklist,
  buildStorySEOChecklist
} from "@/lib/seo/seo-checklist";
import { isUrlSafeSlug } from "@/lib/seo/slugify-vi";
import {
  formatKeywordsInput,
  parseKeywordsInput
} from "@/lib/seo/suggest-keywords";
import type { ChapterSEOInput, StorySEOInput } from "@/types/seo";

type SEOAssistantPanelProps = {
  canonicalUrl?: string;
  chapterContext?: ChapterSEOInput;
  disabled?: boolean;
  episodeNumber?: number;
  hasCover?: boolean;
  hasGenre?: boolean;
  hasTags?: boolean;
  isIndexable?: boolean;
  isPublishedStory?: boolean;
  keywords: string[];
  mode: "story" | "chapter";
  onCanonicalUrlChange?: (value: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onSeoDescriptionChange: (value: string) => void;
  onSeoTitleChange: (value: string) => void;
  onSlugChange?: (value: string) => void;
  originalSlug?: string;
  seoDescription: string;
  seoTitle: string;
  slug?: string;
  storyContext: StorySEOInput;
  storySlug?: string;
};

export function SEOAssistantPanel({
  canonicalUrl = "",
  chapterContext,
  disabled,
  episodeNumber,
  hasCover,
  hasGenre,
  hasTags,
  isIndexable = false,
  isPublishedStory,
  keywords,
  mode,
  onCanonicalUrlChange,
  onKeywordsChange,
  onSeoDescriptionChange,
  onSeoTitleChange,
  onSlugChange,
  originalSlug,
  seoDescription,
  seoTitle,
  slug,
  storyContext,
  storySlug
}: SEOAssistantPanelProps) {
  const [keywordInput, setKeywordInput] = useState(formatKeywordsInput(keywords));
  const [previewTab, setPreviewTab] = useState<"google" | "social">("google");

  const publicPath =
    mode === "story"
      ? slug
        ? `chapmee.vn/truyen/${slug}`
        : "chapmee.vn/truyen/..."
      : storySlug && episodeNumber
        ? `chapmee.vn/truyen/${storySlug}/chuong/${episodeNumber}`
        : "chapmee.vn/truyen/.../chuong/...";

  const checklist = useMemo(() => {
    if (mode === "chapter") {
      return buildChapterSEOChecklist({
        isIndexable,
        seoDescription,
        seoTitle
      });
    }

    return buildStorySEOChecklist({
      hasCover,
      hasGenre,
      hasTags,
      isIndexable,
      seoDescription,
      seoTitle,
      slug
    });
  }, [
    hasCover,
    hasGenre,
    hasTags,
    isIndexable,
    mode,
    seoDescription,
    seoTitle,
    slug
  ]);

  const slugChanged =
    Boolean(isPublishedStory) &&
    Boolean(originalSlug) &&
    Boolean(slug) &&
    slug !== originalSlug;

  function handleAutofill() {
    if (mode === "chapter" && chapterContext) {
      const generated = generateChapterSEO(chapterContext, {
        authorName: storyContext.authorName,
        genreName: storyContext.genreName,
        tagNames: storyContext.tagNames,
        title: storyContext.title
      });

      onSeoTitleChange(generated.title);
      onSeoDescriptionChange(generated.description);
      onKeywordsChange(generated.keywords);
      setKeywordInput(formatKeywordsInput(generated.keywords));
      return;
    }

    const generated = generateStorySEO({
      ...storyContext,
      hasCover,
      hasGenre,
      hasTags,
      isIndexable
    });

    onSeoTitleChange(generated.title);
    onSeoDescriptionChange(generated.description);
    onKeywordsChange(generated.keywords);
    setKeywordInput(formatKeywordsInput(generated.keywords));

    if (onSlugChange && !isPublishedStory) {
      onSlugChange(generated.slugSuggestion);
    }
  }

  function handleKeywordsBlur() {
    const parsed = parseKeywordsInput(keywordInput);
    onKeywordsChange(parsed);
    setKeywordInput(formatKeywordsInput(parsed));
  }

  return (
    <Card className="space-y-4" id="seo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">SEO</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Mô tả lấy từ nội dung có sẵn — không dùng trí tuệ nhân tạo.
          </p>
        </div>
        <Button
          disabled={disabled}
          onClick={handleAutofill}
          type="button"
          variant="secondary"
        >
          Tự điền theo mẫu
        </Button>
      </div>

      <Input
        disabled={disabled}
        label="Tiêu đề SEO"
        name="seo_title"
        onChange={(event) => onSeoTitleChange(event.target.value)}
        value={seoTitle}
      />

      <div className="space-y-1">
        <Textarea
          disabled={disabled}
          label="Mô tả SEO"
          name="seo_description"
          onChange={(event) => onSeoDescriptionChange(event.target.value)}
          rows={4}
          value={seoDescription}
        />
        <p className="text-xs text-zinc-500">
          {seoDescription.length}/160 ký tự (mục tiêu 80–160)
        </p>
      </div>

      <Input
        disabled={disabled}
        label="Từ khóa"
        name="seo_keywords"
        onBlur={handleKeywordsBlur}
        onChange={(event) => setKeywordInput(event.target.value)}
        placeholder="Tối đa 10, cách nhau bởi dấu phẩy"
        value={keywordInput}
      />

      {mode === "story" ? (
        <>
          <p className="text-sm text-zinc-500">
            Đường dẫn:{" "}
            <span className="text-zinc-300">
              chapmee.vn/truyen/{slug?.trim() || "..."}
            </span>
          </p>
          {slugChanged ? (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              Bạn đang đổi đường dẫn truyện đã public. Liên kết cũ có thể không còn
              hoạt động.
            </p>
          ) : null}
          {!slug || !isUrlSafeSlug(slug) ? (
            <p className="text-xs text-rose-300">
              Đường dẫn chỉ dùng chữ thường, số và dấu gạch ngang (chỉnh ở trên).
            </p>
          ) : null}
          <Input
            disabled={disabled}
            label="URL chuẩn (tuỳ chọn)"
            name="canonical_url"
            onChange={(event) => onCanonicalUrlChange?.(event.target.value)}
            placeholder="https://..."
            value={canonicalUrl}
          />
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Đường dẫn chương: <span className="text-zinc-300">{publicPath}</span>
        </p>
      )}

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              previewTab === "google"
                ? "bg-sky-300 text-zinc-950"
                : "bg-white/5 text-zinc-300"
            }`}
            onClick={() => setPreviewTab("google")}
            type="button"
          >
            Xem trước trên Google
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              previewTab === "social"
                ? "bg-sky-300 text-zinc-950"
                : "bg-white/5 text-zinc-300"
            }`}
            onClick={() => setPreviewTab("social")}
            type="button"
          >
            Xem trước khi chia sẻ
          </button>
        </div>
        <SEOPreview
          description={seoDescription}
          title={seoTitle}
          url={publicPath}
          variant={previewTab}
        />
      </div>

      <ul className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        {checklist.map((item) => (
          <li
            className={`flex items-start gap-2 text-sm ${
              item.passed ? "text-emerald-200" : "text-amber-100"
            }`}
            key={item.id}
          >
            <span aria-hidden>{item.passed ? "✓" : "•"}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
