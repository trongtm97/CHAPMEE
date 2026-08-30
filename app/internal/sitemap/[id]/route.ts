import { buildSitemapChildEntries } from "@/lib/seo/sitemap-builders";
import { resolveSitemapChildFromId } from "@/lib/seo/sitemap-children";
import {
  getSeoSitemapSettings,
  isSitemapPublishingEnabled
} from "@/lib/seo/sitemap-service";
import { buildUrlsetXml, sitemapXmlResponseHeaders } from "@/lib/seo/sitemap-xml";

export const dynamic = "force-dynamic";

type SitemapChildRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, props: SitemapChildRouteProps) {
  const { id } = await props.params;
  const settings = await getSeoSitemapSettings();

  if (!(await isSitemapPublishingEnabled(settings))) {
    return new Response(buildUrlsetXml([]), {
      headers: sitemapXmlResponseHeaders()
    });
  }

  const child = resolveSitemapChildFromId(id, settings);
  if (!child) {
    return new Response(buildUrlsetXml([]), {
      headers: sitemapXmlResponseHeaders(),
      status: 404
    });
  }

  const entries = await buildSitemapChildEntries(child, settings);
  return new Response(buildUrlsetXml(entries), {
    headers: sitemapXmlResponseHeaders()
  });
}
