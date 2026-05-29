import {
  extractLeadingSentences,
  trimSeoDescription,
  trimSeoTitle
} from "@/lib/seo/extract-description";
import { suggestChapterKeywords } from "@/lib/seo/suggest-keywords";
import type { ChapterSEOInput, GeneratedChapterSEO } from "@/types/seo";

export function generateChapterSEO(
  chapter: ChapterSEOInput,
  story?: { title: string; genreName?: string | null; tagNames?: string[]; authorName?: string | null }
): GeneratedChapterSEO {
  const storyTitle = story?.title.trim() || chapter.storyTitle.trim();
  const chapterTitle = chapter.title.trim();
  const rawTitle = `${chapterTitle} - ${storyTitle}`;
  const seoTitle = trimSeoTitle(rawTitle, 60);

  const leading = extractLeadingSentences(chapter.content, 2);

  const description = leading
    ? trimSeoDescription(leading)
    : trimSeoDescription(
        `Đọc ${chapterTitle} của truyện ${storyTitle} trên ChapMee.`
      );

  const keywords = suggestChapterKeywords({
    authorName: story?.authorName ?? chapter.authorName,
    chapterTitle,
    genreName: story?.genreName ?? chapter.genreName,
    storyTitle,
    tagNames: story?.tagNames ?? chapter.tagNames
  });

  return {
    description,
    keywords,
    title: seoTitle
  };
}
