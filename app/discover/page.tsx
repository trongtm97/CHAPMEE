import type { Metadata } from "next";
import { Suspense } from "react";
import { DesktopDiscoverLayout } from "@/components/discover/DesktopDiscoverLayout";
import { MobileDiscoverLayout } from "@/components/discover/MobileDiscoverLayout";
import { LoadingState } from "@/components/ui";
import { isSponsoredContentEnabled } from "@/lib/campaigns/feature";
import { getDiscoverDataCached } from "@/lib/discover/getDiscoverDataCached";
import { buildCanonicalUrl, cleanText } from "@/lib/seo/metadata";
import { getActiveCampaignByType } from "@/lib/supabase/campaigns";

type DiscoverPageProps = {
  searchParams: Promise<{
    q?: string;
    genre?: string;
  }>;
};

export const revalidate = 60;

export async function generateMetadata({
  searchParams
}: DiscoverPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = cleanText(params.q);
  const genre = cleanText(params.genre);
  const title = genre
    ? `Khám phá thể loại ${genre}`
    : query
      ? `Kết quả tìm kiếm: ${query}`
      : "Khám phá truyện";
  const description = genre
    ? `Khám phá truyện theo thể loại ${genre} trên ChapMee.`
    : query
      ? `Xem kết quả tìm kiếm cho "${query}" trên ChapMee.`
      : "Tìm truyện, lọc theo thể loại và khám phá những chap ngắn mới trên ChapMee.";
  const canonicalPath = query
    ? `/discover?q=${encodeURIComponent(query)}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`
    : genre
      ? `/discover?genre=${encodeURIComponent(genre)}`
      : "/discover";
  const canonical = buildCanonicalUrl(canonicalPath);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      ...(canonical ? { url: canonical } : {})
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  };
}

async function DiscoverContent({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const activeGenre = params.genre ?? "";
  const [data, sponsoredEnabled] = await Promise.all([
    getDiscoverDataCached(query, activeGenre),
    isSponsoredContentEnabled()
  ]);
  const sponsoredBanner = sponsoredEnabled
    ? await getActiveCampaignByType("banner")
    : null;
  return (
    <>
      <MobileDiscoverLayout activeGenre={activeGenre} data={data} query={query} />
      <DesktopDiscoverLayout
        activeGenre={activeGenre}
        data={data}
        query={query}
        sponsoredBanner={sponsoredBanner}
      />
    </>
  );
}

export default function DiscoverPage(props: DiscoverPageProps) {
  return (
    <Suspense fallback={<LoadingState label="Đang tải trang khám phá..." />}>
      <DiscoverContent {...props} />
    </Suspense>
  );
}
