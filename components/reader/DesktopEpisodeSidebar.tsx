import Link from "next/link";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type DesktopEpisodeSidebarProps = {
  story: StoryDetail;
  currentEpisodeNumber: number;
};

export function DesktopEpisodeSidebar({
  currentEpisodeNumber,
  story
}: DesktopEpisodeSidebarProps) {
  return (
    <nav aria-label="Danh sách chương" className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">
        Danh sách chương
      </p>
      <p className="line-clamp-2 text-sm font-bold text-white">{story.title}</p>
      <ul className="max-h-[calc(100vh-8rem)] space-y-0.5 overflow-y-auto pr-1">
        {story.episodes.map((episode) => {
          const isCurrent = episode.episodeNumber === currentEpisodeNumber;
          return (
            <li key={episode.id}>
              <Link
                className={`block rounded-lg px-2 py-2 text-sm transition ${
                  isCurrent
                    ? "bg-cyan-300/12 font-bold text-cyan-100"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
                href={`/stories/${story.slug}/episodes/${episode.episodeNumber}`}
              >
                <span className="font-semibold text-zinc-500">#{episode.episodeNumber}</span>{" "}
                <span className="line-clamp-1">{episode.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
