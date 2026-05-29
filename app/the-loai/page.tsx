import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getPublicGenresWithContent } from "@/lib/supabase/public-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thể loại truyện trên ChapMee",
  description: "Duyệt truyện theo thể loại để khám phá đúng gu đọc của bạn.",
  alternates: { canonical: buildCanonicalUrl("/the-loai") }
};

export default async function GenresIndexPage() {
  const genres = await getPublicGenresWithContent();
  const activeGenres = genres.filter((genre) => genre.story_count > 0);

  return (
    <section className="space-y-6">
      <div>
        <p className="page-kicker">Thể loại</p>
        <h1 className="page-title">Khám phá theo thể loại</h1>
        <p className="page-copy">Chọn thể loại để vào danh sách truyện public tương ứng.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activeGenres.map((genre) => (
          <Link
            className="chap-card block space-y-1 p-4 transition hover:border-cyan-300/30"
            href={`/the-loai/${genre.slug}`}
            key={genre.slug}
          >
            <p className="text-base font-bold text-white">{genre.name}</p>
            <p className="text-sm text-zinc-400">{genre.story_count} truyện public</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
