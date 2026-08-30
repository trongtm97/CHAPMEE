"use client";

import type { GroupFeedFilterId } from "@/lib/community-sync/constants";

export type StoryGroupActivityFilterPresence = {
  showReels: boolean;
  showAudio: boolean;
  showFilms: boolean;
  showReviews: boolean;
};

const FILTER_OPTIONS: Array<{ id: GroupFeedFilterId; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "chapters", label: "Truyện/Chương" },
  { id: "reels", label: "Reels" },
  { id: "audio", label: "Audio" },
  { id: "films", label: "Phim/Chuyển thể" },
  { id: "reviews", label: "Review" }
];

type StoryGroupActivityFiltersProps = {
  activeFilter: GroupFeedFilterId;
  presence: StoryGroupActivityFilterPresence;
  onChange: (filter: GroupFeedFilterId) => void;
};

export function StoryGroupActivityFilters({
  activeFilter,
  onChange,
  presence
}: StoryGroupActivityFiltersProps) {
  const visible = FILTER_OPTIONS.filter((option) => {
    if (option.id === "all" || option.id === "chapters") {
      return true;
    }
    if (option.id === "reels") {
      return presence.showReels;
    }
    if (option.id === "audio") {
      return presence.showAudio;
    }
    if (option.id === "films") {
      return presence.showFilms;
    }
    if (option.id === "reviews") {
      return presence.showReviews;
    }
    return false;
  });

  if (visible.length <= 2) {
    return null;
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-1.5" role="group" aria-label="Lọc hoạt động">
        {visible.map((option) => (
          <button
            className={`rounded-full border px-2.5 py-1.5 text-[0.68rem] font-bold transition ${
              activeFilter === option.id
                ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
            }`}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
