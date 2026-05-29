import Link from "next/link";
import { Card } from "@/components/ui";
import type { DiscoverGenre } from "@/lib/discover/getDiscoverData";

type GenreGridProps = {
  genres: DiscoverGenre[];
  activeGenre: string;
  query: string;
};

export function GenreGrid({ activeGenre, genres, query }: GenreGridProps) {
  if (genres.length === 0) {
    return (
      <Card className="border-white/8 bg-white/[0.035] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
            <span aria-hidden="true" className="block h-2.5 w-2.5 rounded-full bg-current" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Chưa có thể loại</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Thể loại sẽ hiện ở đây ngay khi có nội dung công khai.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {genres.map((genre) => {
        const params = new URLSearchParams();

        if (query) {
          params.set("q", query);
        }

        if (activeGenre !== genre.slug) {
          params.set("genre", genre.slug);
        }

        const href = params.toString()
          ? `/discover?${params.toString()}`
          : "/discover";
        const active = activeGenre === genre.slug;

        return (
          <Link
            className={`tap-highlight min-h-28 rounded-[1.25rem] border p-4 transition ${
              active
                ? "border-cyan-300/30 bg-cyan-300/12 shadow-[0_0_0_1px_rgba(125,211,252,0.14)]"
                : "border-white/10 bg-[var(--surface)] hover:border-white/20 hover:bg-[var(--surface-soft)]"
            }`}
            href={href}
            key={genre.id}
          >
            <p className="text-sm font-black text-white">{genre.name}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-400">
              {genre.description ?? "Khám phá truyện trong thể loại này."}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
