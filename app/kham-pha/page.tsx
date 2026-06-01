import type { Metadata } from "next";
import { KhamPhaHubPage } from "@/components/taxonomy/KhamPhaHubPage";
import { getKhamPhaHubSectionStats } from "@/lib/discovery/kham-pha-hub-stats";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Khám phá taxonomy truyện | ChapMee",
  description:
    "Trung tâm duyệt truyện theo thể loại, tag, bối cảnh, cảm giác đọc và các nhãn taxonomy khác trên ChapMee.",
  alternates: { canonical: buildCanonicalUrl("/kham-pha") },
  robots: { index: true, follow: true }
};

export default async function KhamPhaIndexPage() {
  const sectionStats = await getKhamPhaHubSectionStats();
  return <KhamPhaHubPage sectionStats={sectionStats} />;
}
