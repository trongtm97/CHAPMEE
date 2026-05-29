import Link from "next/link";
import type { DashboardHighlight } from "@/lib/creator/getCreatorDashboardData";

type HighlightCardProps = {
  highlight: DashboardHighlight;
};

const highlightStyles: Record<
  string,
  {
    border: string;
    bg: string;
    accent: string;
    icon: string;
  }
> = {
  most_read: {
    border: "border-cyan-300/20",
    bg: "bg-gradient-to-br from-cyan-500/15 via-sky-500/8 to-blue-600/15",
    accent: "text-cyan-200",
    icon: "👑"
  },
  most_commented: {
    border: "border-amber-400/20",
    bg: "bg-gradient-to-br from-amber-400/15 via-orange-500/8 to-red-600/15",
    accent: "text-amber-200",
    icon: "🔥"
  },
  trending: {
    border: "border-emerald-400/20",
    bg: "bg-gradient-to-br from-emerald-400/15 via-teal-500/8 to-cyan-600/15",
    accent: "text-emerald-200",
    icon: "📈"
  },
  recent_milestone: {
    border: "border-violet-400/20",
    bg: "bg-gradient-to-br from-violet-500/15 via-purple-500/8 to-indigo-600/15",
    accent: "text-violet-200",
    icon: "🏅"
  },
  new_fan: {
    border: "border-fuchsia-400/20",
    bg: "bg-gradient-to-br from-fuchsia-500/15 via-pink-500/8 to-rose-600/15",
    accent: "text-fuchsia-200",
    icon: "🌟"
  }
};

export function HighlightCard({ highlight }: HighlightCardProps) {
  const style = highlightStyles[highlight.type] ?? highlightStyles.trending;

  const content = (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] border ${style.border} ${style.bg} p-4 transition hover:-translate-y-0.5`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_60%)]" />
      <div className="relative z-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${style.accent}`}>
              {style.icon} Khoảnh khắc đáng khoe
            </p>
            <h3 className="mt-2 text-base font-black leading-6 text-white">
              {highlight.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              {highlight.description}
            </p>
          </div>
          {highlight.value && (
            <span
              className={`shrink-0 rounded-full border ${style.border} ${style.bg} px-3 py-1 text-sm font-black ${style.accent}`}
            >
              {highlight.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (highlight.storySlug) {
    return (
      <Link className="tap-highlight block" href={`/stories/${highlight.storySlug}`}>
        {content}
      </Link>
    );
  }

  return content;
}
