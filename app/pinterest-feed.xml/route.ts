import { buildPinterestFeedItems } from "@/lib/seo/pinterest-feed";
import { escapeXml } from "@/lib/seo/xml-escape";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await buildPinterestFeedItems();

  const body = items
    .map((item) => {
      const loc = escapeXml(item.link);
      const title = escapeXml(item.title);
      const description = escapeXml(item.description);
      const image = item.imageLink ? escapeXml(item.imageLink) : "";
      const category = item.category ? `<g:product_type>${escapeXml(item.category)}</g:product_type>` : "";
      const tags = item.tags
        .map((tag) => `<g:custom_label>${escapeXml(tag)}</g:custom_label>`)
        .join("");

      return `<item>
  <title>${title}</title>
  <description>${description}</description>
  <link>${loc}</link>
  ${image ? `<image:link>${image}</image:link>` : ""}
  <g:availability>${escapeXml(item.availability)}</g:availability>
  ${category}
  ${tags}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>ChapMee Pinterest Feed</title>
<link>${escapeXml(process.env.NEXT_PUBLIC_SITE_URL ?? "https://chapmee.com")}</link>
<description>Canonical story and taxonomy discovery URLs for ChapMee</description>
${body}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
