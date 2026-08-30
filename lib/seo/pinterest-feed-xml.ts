import type { PinterestFeedItem } from "@/lib/seo/pinterest-feed";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { escapeXml } from "@/lib/seo/xml-escape";

type PinterestFeedChannel = {
  title: string;
  description: string;
};

/** Render a Pinterest/Google-compatible RSS 2.0 feed for the given items. */
export function renderPinterestFeedXml(
  items: PinterestFeedItem[],
  channel: PinterestFeedChannel
): string {
  const siteUrl = buildCanonicalUrl("/")?.replace(/\/$/, "") ?? "";

  const body = items
    .map((item) => {
      const loc = escapeXml(item.link);
      const title = escapeXml(item.title);
      const description = escapeXml(item.description);
      const image = item.imageLink ? escapeXml(item.imageLink) : "";
      const category = item.category
        ? `<g:product_type>${escapeXml(item.category)}</g:product_type>`
        : "";
      const tags = item.tags
        .map((tag) => `<g:custom_label>${escapeXml(tag)}</g:custom_label>`)
        .join("");

      return `<item>
  <title>${title}</title>
  <description>${description}</description>
  <link>${loc}</link>
  ${image ? `<g:image_link>${image}</g:image_link>` : ""}
  <g:availability>${escapeXml(item.availability)}</g:availability>
  ${category}
  ${tags}
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${escapeXml(channel.title)}</title>
<link>${escapeXml(siteUrl)}</link>
<description>${escapeXml(channel.description)}</description>
${body}
</channel>
</rss>`;
}

const FEED_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600"
} as const;

export function pinterestFeedResponse(
  items: PinterestFeedItem[],
  channel: PinterestFeedChannel
): Response {
  return new Response(renderPinterestFeedXml(items, channel), { headers: FEED_HEADERS });
}
