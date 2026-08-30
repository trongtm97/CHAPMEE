import type { ReactElement, ReactNode } from "react";
import type { RankingUiTabId } from "@/types/ranking-board";

type IconProps = { className?: string };

function IconShell({ className = "size-5", children }: IconProps & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function TodayIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 3a9 9 0 1 0 9 9 8.2 8.2 0 0 0-3.2-7.2.75.75 0 0 0-.9 1.2A6.7 6.7 0 1 1 12 5.25c.9 0 1.75.18 2.52.5a.75.75 0 1 0 .58-1.38A9 9 0 0 0 12 3Zm0 5.25a.75.75 0 0 0-.75.75v3.94l2.47 1.48a.75.75 0 1 0 .76-1.3L12.75 11V9a.75.75 0 0 0-.75-.75Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M7 2.25a.75.75 0 0 1 .75.75V4h8.5V3a.75.75 0 0 1 1.5 0v1h.75A2.25 2.25 0 0 1 21 6.25v12A2.25 2.25 0 0 1 18.75 20.5H5.25A2.25 2.25 0 0 1 3 18.25v-12A2.25 2.25 0 0 1 5.25 4H6V3a.75.75 0 0 1 1.5 0v1h3.5V3A.75.75 0 0 1 12 2.25ZM4.5 9.5v8.75c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75V9.5h-15Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function SparklesIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 2.5 13.2 8 18.5 9.25 13.2 10.5 12 16l-1.2-5.5L5.5 9.25 10.8 8 12 2.5Zm6.5 11 1 3.5 3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1 1-3.5ZM5 14.5l.6 2.1 2.1.6-2.1.6L5 20l-.6-2.1-2.1-.6 2.1-.6L5 14.5Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function AuthorIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 11.25a3.75 3.75 0 1 0-3.75-3.75A3.75 3.75 0 0 0 12 11.25Zm-7.5 9a7.5 7.5 0 0 1 15 0 .75.75 0 0 1-.75.75h-13.5a.75.75 0 0 1-.75-.75Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function ReelsIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Zm6.75 3.25 6.5 3.75a.75.75 0 0 1 0 1.3l-6.5 3.75A.75.75 0 0 1 10 16.8V7.2a.75.75 0 0 1 .75-.45Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function GenreIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Zm3 2.75h2.25v2.25H7V9.25Zm0 4h2.25v2.25H7v-2.25Zm4-4H17v2.25h-6V9.25Zm0 4H17v2.25h-6v-2.25Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function TrendingIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M4 18.25V16.5h2.75l4.1-5.47 3.15 2.62L18.5 6.5H16V4.75h5.25V10h-1.75V7.35l-5.9 7.02-3.2-2.66-4.35 5.79H4Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function CompletedIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 2.25a9.75 9.75 0 1 0 9.75 9.75A9.76 9.76 0 0 0 12 2.25Zm-1.03 12.53 5.25-5.25a.75.75 0 1 1 1.06 1.06l-5.78 5.78a.75.75 0 0 1-1.06 0l-2.72-2.72a.75.75 0 1 1 1.06-1.06l2.19 2.19Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function BookmarkIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M6.5 3A2.5 2.5 0 0 0 4 5.5v15.75a.75.75 0 0 0 1.14.64L12 18.2l6.86 3.69A.75.75 0 0 0 20 21.25V5.5A2.5 2.5 0 0 0 17.5 3h-11Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M5.5 4A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h3V4h-3Zm5 0v16h4V4h-4Zm6 0h-2v16h2A1.5 1.5 0 0 0 20 18.5v-13A1.5 1.5 0 0 0 18.5 4Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function HeartIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 20.25s-7.5-4.35-7.5-9.75A4.13 4.13 0 0 1 12 7.88a4.13 4.13 0 0 1 7.5 2.62c0 5.4-7.5 9.75-7.5 9.75Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

function StarIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path
        d="M12 2.75 14.75 8l5.75.8-4.15 4.03.98 5.67L12 15.7l-5.33 2.8.98-5.67L3.5 8.8 9.25 8 12 2.75Z"
        fill="currentColor"
      />
    </IconShell>
  );
}

const TAB_ICONS: Record<RankingUiTabId, (props: IconProps) => ReactElement> = {
  today: TodayIcon,
  week: CalendarIcon,
  month: CalendarIcon,
  new_stories: SparklesIcon,
  original_stories: SparklesIcon,
  translation_stories: BookIcon,
  new_authors: AuthorIcon,
  reels: ReelsIcon,
  genre: GenreIcon,
  rising: TrendingIcon,
  completed: CompletedIcon,
  most_saved: BookmarkIcon,
  chapter_next: BookIcon,
  long_tail: HeartIcon,
  boosted: StarIcon
};

export function RankingBoardIcon({ tabId, className = "size-5" }: { tabId: RankingUiTabId; className?: string }) {
  const Icon = TAB_ICONS[tabId];
  return <Icon className={className} />;
}
