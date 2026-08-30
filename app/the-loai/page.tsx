import type { Metadata } from "next";
import { MainGenreIndexPage } from "@/components/taxonomy/MainGenreIndexPage";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getPublicMainGenresWithStoryCounts } from "@/lib/taxonomy/public-genres";
import { createPublicClient } from "@/lib/data/public-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thể loại truyện trên ChapMee",
  description: "Duyệt truyện theo thể loại taxonomy — drama, ngôn tình, kinh dị và nhiều thể loại khác.",
  alternates: { canonical: buildCanonicalUrl("/the-loai") }
};

export default async function TheLoaiIndexPage() {
  const db = createPublicClient();
  const genres = await getPublicMainGenresWithStoryCounts(db);
  return <MainGenreIndexPage genres={genres} />;
}
