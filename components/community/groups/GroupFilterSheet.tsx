"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import type {
  CommunityGroupGenre,
  CommunityGroupSort,
  CommunityGroupStatusFilter,
  CommunityGroupTab
} from "@/types/community-group";

type GroupFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  genres: CommunityGroupGenre[];
  query: string;
  genre: string;
  sort: CommunityGroupSort;
  status: CommunityGroupStatusFilter;
  tab: CommunityGroupTab | null;
};

const statusOptions: { value: CommunityGroupStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "hot", label: "HOT" },
  { value: "new_chapter", label: "Có chương mới" },
  { value: "author_reply", label: "Tác giả trả lời" },
  { value: "following", label: "Nhóm tôi theo dõi" },
  { value: "reading", label: "Nhóm truyện đang đọc" }
];

export function GroupFilterSheet(props: GroupFilterSheetProps) {
  const { onClose, open } = props;

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <GroupFilterSheetPanel key={`${props.genre}|${props.status}|${props.sort}`} {...props} />,
    document.body
  );
}

function GroupFilterSheetPanel({
  genre,
  genres,
  onClose,
  query,
  sort,
  status,
  tab
}: GroupFilterSheetProps) {
  const router = useRouter();
  const [draftGenre, setDraftGenre] = useState(genre);
  const [draftStatus, setDraftStatus] = useState(status);

  function applyFilters() {
    router.push(
      buildCommunityGroupsHref({
        q: query || undefined,
        genre: draftGenre || undefined,
        sort,
        status: draftStatus !== "all" ? draftStatus : undefined,
        tab: tab ?? undefined,
        page: 1
      })
    );
    onClose();
  }

  function clearFilters() {
    router.push(buildCommunityGroupsHref({ q: query || undefined, page: 1 }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button aria-label="Đóng" className="absolute inset-0" onClick={onClose} type="button" />
      <div className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0d1218] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-zinc-50">Bộ lọc</h2>
          <button
            className="text-sm font-semibold text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-300">Thể loại</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={!draftGenre}
                label="Tất cả"
                onClick={() => setDraftGenre("")}
              />
              {genres.map((item) => (
                <FilterChip
                  active={draftGenre === item.slug}
                  key={item.slug}
                  label={item.name}
                  onClick={() => setDraftGenre(item.slug)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-300">Trạng thái nhóm</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <FilterChip
                  active={draftStatus === option.value}
                  key={option.value}
                  label={option.label}
                  onClick={() => setDraftStatus(option.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            className="h-10 flex-1 rounded-lg border border-white/10 text-sm font-bold text-zinc-300"
            onClick={clearFilters}
            type="button"
          >
            Xóa bộ lọc
          </button>
          <button
            className="h-10 flex-1 rounded-lg border border-cyan-300/40 bg-cyan-300/15 text-sm font-bold text-cyan-100"
            onClick={applyFilters}
            type="button"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 text-zinc-300 hover:border-white/20"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
