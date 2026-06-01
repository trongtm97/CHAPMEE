import type { Metadata } from "next";
import { TaxonomyTermIndexPage } from "@/components/taxonomy/TaxonomyTermIndexPage";
import { getTaxonomyIndexConfig, getTaxonomyIndexTerms } from "@/lib/discovery/taxonomy-index";
import type { TaxonomyIndexKey } from "@/lib/discovery/taxonomy-index-config";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export function defineTaxonomyIndexPage(key: TaxonomyIndexKey) {
  const config = getTaxonomyIndexConfig(key);

  async function generateMetadata(): Promise<Metadata> {
    return {
      title: config.metadataTitle,
      description: config.metadataDescription,
      alternates: { canonical: buildCanonicalUrl(config.pathname) }
    };
  }

  async function Page() {
    const { terms } = await getTaxonomyIndexTerms(config);
    return <TaxonomyTermIndexPage config={config} terms={terms} />;
  }

  return { generateMetadata, Page };
}
