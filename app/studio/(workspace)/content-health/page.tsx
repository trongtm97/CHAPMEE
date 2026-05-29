import type { Metadata } from "next";
import Link from "next/link";
import { ContentHealthPage } from "@/components/studio/ContentHealthPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getAuthorContentHealth,
  getAuthorContentQualityDetail
} from "@/lib/content-quality/get-author-content-health";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { studioPath } from "@/lib/studio/constants";
import type { ContentQualityListTab } from "@/types/content-quality";

export const dynamic = "force-dynamic";

const PAGE_TITLE = "Chất lượng nội dung";
const PAGE_SUBTITLE =
  "Theo dõi cảnh báo, lý do đánh giá thấp và hướng xử lý cho truyện của bạn.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${PAGE_TITLE} — ChapMee Studio`,
    description: PAGE_SUBTITLE,
    alternates: { canonical: buildCanonicalUrl(studioPath("/content-health")) }
  };
}

type ContentHealthRouteProps = {
  searchParams: Promise<{
    tab?: string;
    story?: string;
  }>;
};

const VALID_TABS: ContentQualityListTab[] = [
  "all",
  "needs_action",
  "in_review",
  "restored",
  "permanently_hidden"
];

export default async function StudioContentHealthRoute({
  searchParams
}: ContentHealthRouteProps) {
  const params = await searchParams;
  const tabParam = params.tab;
  const activeTab: ContentQualityListTab = VALID_TABS.includes(
    tabParam as ContentQualityListTab
  )
    ? (tabParam as ContentQualityListTab)
    : "all";

  const { creatorProfile, error } = await getStudioAccess(
    studioPath("/content-health")
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader subtitle={PAGE_SUBTITLE} title={PAGE_TITLE} />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const [data, initialDetail] = await Promise.all([
    getAuthorContentHealth(creatorProfile, activeTab),
    params.story
      ? getAuthorContentQualityDetail(creatorProfile, params.story)
      : Promise.resolve(null)
  ]);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href={studioPath("")}
      >
        Trở về tổng quan
      </Link>

      <SectionHeader subtitle={PAGE_SUBTITLE} title={PAGE_TITLE} />

      <ContentHealthPage data={data} initialDetail={initialDetail} />
    </section>
  );
}
