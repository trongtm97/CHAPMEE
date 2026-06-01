import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import { buildCanonicalUrl, resolvePublicUrl } from "@/lib/seo/metadata";
import { getChapterUrl, getStoryUrl } from "@/lib/seo/canonical";

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
  const storyUrl = buildCanonicalUrl(
    getStoryUrl({ slug: story.slug, public_code: story.publicCode })
  );
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
    getChapterUrl(
      { slug: data.story.slug, public_code: data.story.publicCode },
      { slug: data.episode.slug, public_code: data.episode.publicCode }
    )
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
      url: buildCanonicalUrl(
        getStoryUrl({ slug: data.story.slug, public_code: data.story.publicCode })
      )
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
