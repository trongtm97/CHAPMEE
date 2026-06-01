"use client";

import { EmptyState, ErrorState, SectionHeader } from "@/components/ui";
import { RankingBoardCard } from "@/components/rankings/RankingBoardCard";
import { RankingPagination } from "@/components/rankings/RankingPagination";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { useRankingBoard, type GenreOption } from "@/hooks/useRankingBoard";
import type { RankingUiTabId } from "@/types/ranking-board";

type RankingTabsProps = {
  initialTabId?: RankingUiTabId;
  initialGenreSlug?: string | null;
  genres?: GenreOption[];
};

export function RankingTabs({
  initialTabId = "week",
  initialGenreSlug = null,
  genres = []
}: RankingTabsProps) {
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTab,
    genreSlug,
    setGenreSlug,
    page,
    setPage,
    items,
    totalPages,
    totalCount,
    snapshotAt,
    loading,
    error
  } = useRankingBoard(initialTabId, initialGenreSlug);

  return (
    <div className="space-y-6">
      <section>
        <p className="page-kicker">Bảng xếp hạng</p>
        <h1 className="page-title">Bảng xếp hạng</h1>
        <p className="page-copy">
          Nhiều bảng xếp hạng theo thời gian và thể loại — ưu tiên chất lượng đọc,
          không chỉ lượt xem tổng.
        </p>
      </section>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-1">
          {tabs.map((tab) => {
            const active = activeTabId === tab.id;
            return (
              <button
                className={`tap-highlight whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-200 shadow-[0_0_0_1px_rgba(125,211,252,0.14)]"
                    : "border-white/10 bg-[var(--surface)] text-zinc-300 hover:border-white/20 hover:bg-[var(--surface-soft)]"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab.showGenreFilter && genres.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <GenreChip
            active={!genreSlug}
            label="Tất cả thể loại"
            onClick={() => setGenreSlug(null)}
          />
          {genres.map((genre) => (
            <GenreChip
              active={genreSlug === genre.slug}
              key={genre.slug}
              label={genre.name}
              onClick={() => setGenreSlug(genre.slug)}
            />
          ))}
        </div>
      ) : null}

      <SectionHeader
        subtitle={
          snapshotAt
            ? `${activeTab.description} · Cập nhật ${formatSnapshotTime(snapshotAt)} · ${totalCount} mục`
            : activeTab.description
        }
        title={activeTab.label}
      />

      {error ? (
        <ErrorState
          message={error}
          title="Không tải được bảng xếp hạng"
          variant="warning"
        />
      ) : loading ? (
        <RankingSkeleton count={5} />
      ) : items.length === 0 ? (
        <EmptyState
          description="Hệ thống đang tổng hợp snapshot xếp hạng. Vui lòng quay lại sau vài phút."
          title="Chưa có dữ liệu"
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <RankingBoardCard item={item} key={`${item.itemType}-${item.id}`} />
            ))}
          </div>
          <RankingPagination
            onPageChange={setPage}
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}

function GenreChip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`tap-highlight rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function formatSnapshotTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
