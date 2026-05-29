import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import { buildCanonicalUrl, resolvePublicUrl } from "@/lib/seo/metadata";

type BreadcrumbItem = {
  name: string;
  url: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function buildStoryBookJsonLd(story: StoryDetail) {
  const storyUrl = buildCanonicalUrl(`/truyen/${story.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: story.title,
    description: story.shortDescription ?? story.hook ?? undefined,
    url: storyUrl,
    image: resolvePublicUrl(story.coverUrl) ?? undefined,
    author: story.creatorName
      ? {
          "@type": "Person",
          name: story.creatorName
        }
      : undefined,
    genre: story.genreName ?? undefined,
    keywords: story.tags.length > 0 ? story.tags.join(", ") : undefined
  };
}

export function buildEpisodeArticleJsonLd(data: EpisodeReaderData) {
  const episodeUrl = buildCanonicalUrl(
    `/truyen/${data.story.slug}/chuong/${data.episode.episodeNumber}`
  );

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${data.episode.title} - ${data.story.title}`,
    url: episodeUrl,
    datePublished: data.episode.publishedAt ?? undefined,
    author: data.story.creatorName
      ? {
          "@type": "Person",
          name: data.story.creatorName
        }
      : undefined,
    isPartOf: {
      "@type": "Book",
      name: data.story.title,
      url: buildCanonicalUrl(`/truyen/${data.story.slug}`)
    }
  };
}

export function buildPersonJsonLd(input: {
  name: string;
  url: string;
  description?: string | null;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    description: input.description ?? undefined,
    image: resolvePublicUrl(input.image) ?? undefined
  };
}
