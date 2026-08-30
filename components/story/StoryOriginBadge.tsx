import type { StoryCatalogStory } from "@/types/story";

type StoryOriginBadgeProps = {
  contentOrigin?: StoryCatalogStory["contentOrigin"];
  rightsStatus?: string | null;
  compact?: boolean;
};

export function StoryOriginBadge({
  contentOrigin,
  rightsStatus,
  compact = false
}: StoryOriginBadgeProps) {
  if (contentOrigin !== "translation") {
    return (
      <span className={`rounded-full bg-cyan-300/15 px-2 py-0.5 ${compact ? "text-[10px]" : "text-xs"} font-semibold text-cyan-100`}>
        Truyện sáng tác
      </span>
    );
  }

  const isVerified = rightsStatus === "verified";
  return (
    <span className={`rounded-full px-2 py-0.5 ${compact ? "text-[10px]" : "text-xs"} font-semibold ${
      isVerified
        ? "bg-emerald-400/15 text-emerald-100"
        : "bg-violet-400/15 text-violet-100"
    }`}>
      {isVerified ? "Truyện dịch · Có phép" : "Truyện dịch"}
    </span>
  );
}
