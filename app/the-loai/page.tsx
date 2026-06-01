import type { Metadata } from "next";
import { MainGenreIndexPage } from "@/components/taxonomy/MainGenreIndexPage";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getPublicMainGenresWithStoryCounts } from "@/lib/taxonomy/public-genres";
import { createPublicClient } from "@/lib/supabase/public-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thể loại truyện trên ChapMee",
  description: "Duyệt truyện theo thể loại taxonomy — drama, ngôn tình, kinh dị và nhiều thể loại khác.",
  alternates: { canonical: buildCanonicalUrl("/the-loai") }
};

export default async function TheLoaiIndexPage() {
  const supabase = createPublicClient();
  const genres = await getPublicMainGenresWithStoryCounts(supabase);
  return <MainGenreIndexPage genres={genres} />;
}
