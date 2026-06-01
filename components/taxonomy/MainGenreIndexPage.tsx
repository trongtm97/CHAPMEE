import Link from "next/link";
import type { PublicGenreFacet } from "@/lib/taxonomy/public-genres";

type MainGenreIndexPageProps = {
  genres: PublicGenreFacet[];
};

export function MainGenreIndexPage({ genres }: MainGenreIndexPageProps) {
  const activeGenres = genres.filter((genre) => genre.story_count > 0);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="page-kicker">Thể loại</p>
        <h1 className="page-title">Khám phá theo thể loại</h1>
        <p className="page-copy max-w-2xl">
          Chọn thể loại chính từ taxonomy ChapMee — danh sách truyện public và bộ lọc đầy đủ trên
          từng trang thể loại.
        </p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <Link className="text-cyan-200 hover:text-cyan-100" href="/truyen">
            Danh mục truyện
          </Link>
          <Link className="text-cyan-200 hover:text-cyan-100" href="/bang-xep-hang">
            Bảng xếp hạng
          </Link>
          <Link className="text-cyan-200 hover:text-cyan-100" href="/discover">
            Khám phá
          </Link>
          <Link className="text-cyan-200 hover:text-cyan-100" href="/the-loai-phu">
            Thể loại phụ
          </Link>
          <Link className="text-cyan-200 hover:text-cyan-100" href="/kham-pha">
            Tất cả nhóm taxonomy
          </Link>
        </div>
      </div>

      {activeGenres.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[var(--surface)] p-4 text-sm text-zinc-400">
          Chưa có thể loại nào có truyện public. Hãy thử danh mục truyện tổng hợp.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeGenres.map((genre) => (
            <article
              className="chap-card flex flex-col justify-between gap-3 p-4 transition hover:border-cyan-300/30"
              key={genre.slug}
            >
              <div className="space-y-1">
                <Link className="text-base font-bold text-white hover:text-cyan-100" href={`/the-loai/${genre.slug}`}>
                  {genre.name}
                </Link>
                <p className="text-sm text-zinc-400">{genre.story_count} truyện public</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100"
                  href={`/the-loai/${genre.slug}`}
                >
                  Xem truyện
                </Link>
                <Link
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:border-white/25"
                  href={`/the-loai/${genre.slug}/bang-xep-hang`}
                >
                  Bảng xếp hạng
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
