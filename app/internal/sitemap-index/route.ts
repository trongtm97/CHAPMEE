import { buildSitemapIndexXml } from "@/lib/seo/sitemap-service";
import { sitemapXmlResponseHeaders } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await buildSitemapIndexXml();
  return new Response(xml, {
    headers: sitemapXmlResponseHeaders()
  });
}
