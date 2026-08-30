import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo/metadata";
import type { ResolvedSeoMetadata } from "@/lib/seo/seo-types";

/** Convert resolved SEO result to Next.js `Metadata` for `generateMetadata()`. */
export function createNextMetadata(result: ResolvedSeoMetadata): Metadata {
  const metadata: Metadata = {
    // Root layout uses `%s | ${SITE_NAME}` — SEO engine already emits full titles.
    title: { absolute: result.title },
    description: result.description
  };

  if (result.alternates?.canonical) {
    metadata.alternates = { canonical: result.alternates.canonical };
  }

  if (result.robots) {
    metadata.robots = result.robots;
  }

  if (result.openGraph) {
    metadata.openGraph = {
      siteName: SITE_NAME,
      ...result.openGraph
    };
  }

  if (result.twitter) {
    metadata.twitter = result.twitter;
  }

  if (result.keywords?.length) {
    metadata.keywords = result.keywords;
  }

  return metadata;
}
