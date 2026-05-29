import Link from "next/link";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import {
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
  getStoryPlaceholderInitial
} from "@/lib/images/placeholders";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";

type MobileStoryCardProps = {
  story: DiscoverStory;
};

const gradientByGenre: Record<string, string> = {
  drama: "from-rose-400/40 via-fuchsia-400/25 to-indigo-500/30",
  "kinh-di": "from-violet-500/35 via-slate-600/40 to-zinc-900/60",
  "ngon-tinh": "from-pink-400/35 via-rose-300/25 to-orange-300/30",
  "trinh-tham": "from-sky-400/35 via-cyan-400/20 to-slate-700/35",
  "hai-huoc": "from-yellow-300/45 via-amber-300/35 to-orange-400/25",
  "doi-thuong": "from-emerald-300/35 via-teal-300/20 to-cyan-500/20"
};

function getGradient(story: DiscoverStory) {
  if (story.genreSlug && gradientByGenre[story.genreSlug]) {
    return gradientByGenre[story.genreSlug];
  }

  return "from-cyan-300/35 via-sky-300/20 to-indigo-400/30";
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

export function MobileStoryCard({ story }: MobileStoryCardProps) {
  const excerpt = story.hook ?? story.shortDescription ?? "Một truyện ngắn đang chờ bạn khám phá.";
  const mood = story.tagNames[0] ?? story.genreName ?? "Khám phá";
  const publishedDate = story.publishedAt ? new Date(story.publishedAt) : null;
  const statLabel = publishedDate
    ? `${publishedDate.getDate()}/${publishedDate.getMonth() + 1}`
    : "Mới";
  const cover = getStoryImageForUsage(
    { title: story.title, coverUrl: story.coverUrl },
    "discoverCard"
  );

  return (
    <Link
      className="tap-highlight block w-[13.75rem] shrink-0 snap-start md:w-[15rem]"
      href={`/truyen/${story.slug}`}
    >
      <article className="h-full rounded-2xl border border-white/10 bg-[var(--surface)] p-2.5 transition hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div
          className={`relative mb-2.5 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${getGradient(story)}`}
        >
          {cover.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={cover.alt}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              src={cover.src}
              style={{ objectPosition: cover.objectPosition }}
            />
          ) : (
            <span
              className={`absolute inset-0 flex items-center justify-center text-sm font-black text-white/85 ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS}`}
            >
              {getStoryPlaceholderInitial(story.title)}
            </span>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-100">
            {mood}
          </span>
        </div>

        <h3 className="line-clamp-2 text-sm font-black leading-5 text-white">{story.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-[1.15rem] text-zinc-300">{excerpt}</p>

        <p className="mt-1.5 truncate text-[11px] text-zinc-400">{story.creatorName ?? "Tác giả ChapMee"}</p>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="truncate">🔥 {compactNumber(Math.max(story.score, 0))}</span>
          <span className="truncate">{story.isCompleted ? "Hoàn thành" : `${statLabel} cập nhật`}</span>
        </div>

        <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-extrabold text-cyan-200">
          Đọc thử
          <span aria-hidden="true">→</span>
        </span>
      </article>
    </Link>
  );
}
