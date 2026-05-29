import {
  pickStoryDescriptionSource,
  trimSeoDescription,
  trimSeoTitle
} from "@/lib/seo/extract-description";
import { slugifyVietnamese } from "@/lib/seo/slugify-vi";
import { suggestStoryKeywords } from "@/lib/seo/suggest-keywords";
import type { GeneratedStorySEO, StorySEOInput } from "@/types/seo";

export function generateStorySEO(input: StorySEOInput): GeneratedStorySEO {
  const genre = input.genreName?.trim();
  const title = input.title.trim();

  const titleWithGenre = genre
    ? `${title} - Truyện ${genre} trên ChapMee`
    : `${title} - Đọc truyện trên ChapMee`;

  const seoTitle = trimSeoTitle(titleWithGenre);

  const descriptionSource = pickStoryDescriptionSource({
    hook: input.hook,
    longDescription: input.longDescription,
    shortDescription: input.shortDescription
  });

  const description = descriptionSource
    ? trimSeoDescription(descriptionSource)
    : trimSeoDescription(
        genre
          ? `Đọc ${title} trên ChapMee. Khám phá truyện thuộc thể loại ${genre} với nhiều chương hấp dẫn.`
          : `Đọc ${title} trên ChapMee. Khám phá truyện với nhiều chương hấp dẫn.`
      );

  const keywords = suggestStoryKeywords({
    authorName: input.authorName,
    genreName: genre,
    tagNames: input.tagNames,
    title
  });

  return {
    description,
    keywords,
    slugSuggestion: slugifyVietnamese(title),
    title: seoTitle
  };
}
