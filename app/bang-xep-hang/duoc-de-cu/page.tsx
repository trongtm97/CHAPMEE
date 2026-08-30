import type { Metadata } from "next";
import { RankingsPageByType } from "@/components/rankings/RankingsPageByType";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

const PATH = "/bang-xep-hang/duoc-de-cu";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: PATH,
    pageType: "ranking",
    targetType: "ranking",
    fallbackTitle: "Bảng xếp hạng truyện được đề cử - ChapMee",
    fallbackDescription:
      "Khám phá những truyện được độc giả ChapMee dùng Phiếu đề cử ủng hộ nhiều nhất.",
    indexableOverride: true
  });
}

export default function RecommendedRankingPage() {
  return <RankingsPageByType boostedPage initialTabId="boosted" typeSlug="duoc-de-cu" />;
}
