import {
  STORY_STATUS_BADGE_CLASS,
  getChapterStatusLabel,
  getStoryStatusLabel
} from "@/lib/studio/status-labels";
import type { StudioDisplayStatus } from "@/types/studio";

type StudioStatusBadgeProps = {
  status: StudioDisplayStatus;
  kind?: "story" | "chapter";
  className?: string;
};

export function StudioStatusBadge({
  className = "",
  kind = "story",
  status
}: StudioStatusBadgeProps) {
  const label =
    kind === "chapter" ? getChapterStatusLabel(status) : getStoryStatusLabel(status);

  return (
    <span
      className={`inline-flex w-fit max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STORY_STATUS_BADGE_CLASS[status]} ${className}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
