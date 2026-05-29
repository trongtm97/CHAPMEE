import Link from "next/link";
import type { DiscoverGenre } from "@/lib/discover/getDiscoverData";

type MoodChipCarouselProps = {
  genres?: DiscoverGenre[];
  activeGenre?: string;
  query?: string;
  variant?: "catalog" | "discover";
};

const catalogMoods = [
  { label: "Tất cả", href: "/truyen" },
  { label: "Drama", href: "/truyen?genre=drama&page=1" },
  { label: "Ngôn tình", href: "/truyen?genre=ngon-tinh&page=1" },
  { label: "Chữa lành", href: "/truyen?genre=chua-lanh&page=1" },
  { label: "Kinh dị", href: "/truyen?genre=kinh-di&page=1" },
  { label: "Trinh thám", href: "/truyen?genre=trinh-tham&page=1" },
  { label: "Chat story", href: "/truyen?genre=chat-story&page=1" },
  { label: "Đọc nhanh", href: "/truyen?sort=quick&page=1" }
] as const;

const preferredMoodOrder = [
  "chat story",
  "chữa lành",
  "drama",
  "kinh dị",
  "ngôn tình",
  "trinh thám",
  "hài hước",
  "đời thường",
  "cực ngắn"
];

export function MoodChipCarousel({
  activeGenre = "",
  genres = [],
  query = "",
  variant = "discover"
}: MoodChipCarouselProps) {
  if (variant === "catalog") {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-bold tracking-[0.01em] text-white">Mood hôm nay</h2>
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex min-w-max snap-x snap-mandatory gap-2 pb-0.5 pr-4 md:min-w-0 md:flex-wrap md:snap-none md:pr-0">
            {catalogMoods.map((mood) => (
              <Chip href={mood.href} isActive={false} key={mood.href}>
                {mood.label}
              </Chip>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const sortedGenres = [...genres].sort((first, second) => {
    const firstIndex = preferredMoodOrder.indexOf(first.name.toLowerCase());
    const secondIndex = preferredMoodOrder.indexOf(second.name.toLowerCase());
    const a = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;
    const b = secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex;
    return a - b;
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-[0.01em] text-white">Mood hôm nay</h2>
        {activeGenre ? (
          <Link
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
            href={query ? `/discover?q=${encodeURIComponent(query)}` : "/discover"}
          >
            Xóa lọc
          </Link>
        ) : null}
      </div>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max snap-x snap-mandatory gap-2 pb-0.5 pr-4">
          <Chip href={query ? `/discover?q=${encodeURIComponent(query)}` : "/discover"} isActive={!activeGenre}>
            Tất cả
          </Chip>
          {sortedGenres.slice(0, 12).map((genre) => {
            const params = new URLSearchParams();
            if (query) {
              params.set("q", query);
            }
            params.set("genre", genre.slug);
            return (
              <Chip href={`/discover?${params.toString()}`} isActive={activeGenre === genre.slug} key={genre.id}>
                {genre.name}
              </Chip>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type ChipProps = {
  href: string;
  isActive: boolean;
  children: string;
};

function Chip({ children, href, isActive }: ChipProps) {
  return (
    <Link
      className={`tap-highlight snap-start whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition ${
        isActive
          ? "border-cyan-300/55 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}
