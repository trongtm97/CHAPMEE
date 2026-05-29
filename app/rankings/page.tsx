import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingTabs } from "@/components/rankings/RankingTabs";
import { RankingsSupportersSection } from "@/components/rankings/RankingsSupportersSection";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Bảng xếp hạng ChapMee",
  description:
    "Khám phá truyện hot, truyện mới nổi, tác giả nổi bật và Top Fan trên ChapMee.",
  alternates: {
    canonical: buildCanonicalUrl("/bang-xep-hang")
  },
  openGraph: {
    title: "Bảng xếp hạng ChapMee",
    description:
      "Khám phá truyện hot, truyện mới nổi, tác giả nổi bật và Top Fan trên ChapMee.",
    type: "website",
    url: buildCanonicalUrl("/bang-xep-hang") ?? undefined
  },
  twitter: {
    card: "summary",
    title: "Bảng xếp hạng ChapMee",
    description:
      "Khám phá truyện hot, truyện mới nổi, tác giả nổi bật và Top Fan trên ChapMee."
  }
};

function SupportersFallback() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
      <RankingSkeleton count={4} />
    </section>
  );
}

export default function RankingsPage() {
  return (
    <div className="space-y-6">
      <RankingTabs />
      <Suspense fallback={<SupportersFallback />}>
        <RankingsSupportersSection />
      </Suspense>
    </div>
  );
}
