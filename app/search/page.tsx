import type { Metadata } from "next";
import { Suspense } from "react";
import { TaxonomyFilterApplyTracker } from "@/components/analytics/TaxonomyFilterApplyTracker";
import { SearchPageView } from "@/components/search/SearchPageView";
import { LoadingState } from "@/components/ui";
import { buildCanonicalUrl, cleanText } from "@/lib/seo/metadata";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
    genre?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = cleanText(params.q);
  const title = query ? `Tìm kiếm: ${query}` : "Tìm kiếm";
  const description = query
    ? `Kết quả tìm kiếm cho "${query}" trên ChapMee.`
    : "Tìm truyện, tác giả, chương và bài viết trên ChapMee.";
  const canonical = buildCanonicalUrl(
    query ? `/search?q=${encodeURIComponent(query)}` : "/search"
  );

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: query ? { index: false, follow: true } : undefined
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense fallback={<LoadingState label="Đang tìm kiếm..." />}>
      <SearchPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchPageContent({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  return (
    <>
      <TaxonomyFilterApplyTracker
        filters={{ genre: params.genre, q: params.q }}
        sourcePage="search"
      />
      <SearchPageView
        genre={params.genre ?? ""}
        page={Number(params.page ?? "1")}
        query={params.q ?? ""}
        type={params.type ?? "all"}
      />
    </>
  );
}
