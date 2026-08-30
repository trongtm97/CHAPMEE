"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { RankingEmptyState } from "@/components/rankings/RankingEmptyState";
import { RecommendedRankingEmptyState } from "@/components/rankings/RecommendedRankingEmptyState";
import { RankingHero } from "@/components/rankings/RankingHero";
import { RankingList } from "@/components/rankings/RankingList";
import { RankingPagination } from "@/components/rankings/RankingPagination";
import { RankingPeriodTabs } from "@/components/rankings/RankingPeriodTabs";
import { RankingPodium } from "@/components/rankings/RankingPodium";
import { RankingScoringExplainer } from "@/components/rankings/RankingScoringExplainer";
import { RecommendationTicketsInfo } from "@/components/rankings/RecommendationTicketsInfo";
import { RecommendationTicketBalance } from "@/components/wallet/RecommendationTicketBalance";
import { RankingSelector } from "@/components/rankings/RankingSelector";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { useRankingBoard, type GenreOption } from "@/hooks/useRankingBoard";
import {
  BOOSTED_RANKING_PERIOD_OPTIONS,
  formatRankingSnapshotTime,
  RANKING_PERIOD_OPTIONS,
  supportsPeriodFilter
} from "@/lib/ranking/ranking-ui-utils";
import { getRankingPeriodLabel } from "@/lib/ranking/ranking-share";
import type { RankingUiTabId } from "@/types/ranking-board";

type RankingTabsProps = {
  initialTabId?: RankingUiTabId;
  initialGenreSlug?: string | null;
  genres?: GenreOption[];
  /** Dedicated /bang-xep-hang/duoc-de-cu layout (H1, period filter, empty state). */
  boostedPage?: boolean;
  boostFeatureEnabled?: boolean;
  ticketBalance?: number;
  showTicketBalance?: boolean;
};

export function RankingTabs({
  initialTabId = "week",
  initialGenreSlug = null,
  genres = [],
  boostedPage = false,
  boostFeatureEnabled = true,
  ticketBalance = 0,
  showTicketBalance = false
}: RankingTabsProps) {
  const {
    activeTabId,
    activeTab,
    genreSlug,
    setGenreSlug,
    timeWindow,
    setTimeWindow,
    page,
    setPage,
    items,
    totalPages,
    totalCount,
    snapshotAt,
    fallbackNote,
    metricsNote,
    loading,
    error
  } = useRankingBoard(initialTabId, initialGenreSlug, { syncRangeToUrl: boostedPage });

  const isBoostedBoard = boostedPage || activeTabId === "boosted";
  const showPeriodFilter = isBoostedBoard || supportsPeriodFilter(activeTabId);
  const periodOptions = isBoostedBoard
    ? BOOSTED_RANKING_PERIOD_OPTIONS
    : RANKING_PERIOD_OPTIONS;
  const showPodium = page === 1 && items.length > 0;
  const podiumItems = showPodium ? items.filter((item) => item.rank <= 3) : [];
  const listItems =
    page === 1 ? items.filter((item) => item.rank > 3) : items;

  const listSubtitle = snapshotAt
    ? `Cập nhật ${formatRankingSnapshotTime(snapshotAt)}${totalCount > 0 ? ` · ${totalCount} mục` : ""}`
    : totalCount > 0
      ? `${totalCount} mục`
      : null;

  const periodLabel =
    periodOptions.find((option) => option.value === timeWindow)?.label ??
    getRankingPeriodLabel(timeWindow, activeTab.label);

  return (
    <div className="space-y-5 sm:space-y-6">
      {isBoostedBoard ? (
        <RecommendedRankingHero
          snapshotAt={snapshotAt}
          showTicketBalance={showTicketBalance}
          ticketBalance={ticketBalance}
          totalCount={totalCount}
        />
      ) : (
        <RankingHero snapshotAt={snapshotAt} totalCount={totalCount} />
      )}

      {boostedPage ? (
        <nav className="text-sm text-zinc-500">
          <Link className="font-semibold text-zinc-400 hover:text-zinc-200" href="/bang-xep-hang">
            Bảng xếp hạng
          </Link>
          <span className="mx-2 text-zinc-600">/</span>
          <span className="text-zinc-300">Được đề cử</span>
        </nav>
      ) : (
        <RankingSelector activeTabId={activeTabId} />
      )}

      {showPeriodFilter ? (
        <RankingPeriodTabs onChange={setTimeWindow} options={periodOptions} value={timeWindow} />
      ) : null}

      {activeTab.showGenreFilter && genres.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Thể loại
          </p>
          <div className="flex flex-wrap gap-2">
            <GenreChip active={!genreSlug} label="Tất cả thể loại" onClick={() => setGenreSlug(null)} />
            {genres.map((genre) => (
              <GenreChip
                active={genreSlug === genre.slug}
                key={genre.slug}
                label={genre.name}
                onClick={() => setGenreSlug(genre.slug)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            {isBoostedBoard ? "Danh sách xếp hạng" : activeTab.label}
          </h2>
          <p className="text-sm text-zinc-400">
            {isBoostedBoard
              ? "Truyện được sắp theo tổng Phiếu đề cử trong khoảng thời gian bạn chọn."
              : activeTab.tagline}
          </p>
          {listSubtitle ? (
            <p className="text-xs text-zinc-500">{listSubtitle}</p>
          ) : null}
          {metricsNote ? (
            <p className="text-xs leading-5 text-amber-200/75">{metricsNote}</p>
          ) : null}
          {fallbackNote ? (
            <p className="text-xs leading-5 text-zinc-500">{fallbackNote}</p>
          ) : null}
        </header>

        {error ? (
          <ErrorState message={error} title="Không tải được bảng xếp hạng" variant="warning" />
        ) : loading ? (
          <RankingSkeleton count={5} />
        ) : items.length === 0 ? (
          isBoostedBoard ? (
            <RecommendedRankingEmptyState boostFeatureEnabled={boostFeatureEnabled} />
          ) : (
            <RankingEmptyState
              boardLabel={activeTab.label}
              description={activeTab.emptyDescription}
              title={activeTab.emptyTitle}
            />
          )
        ) : (
          <>
            {podiumItems.length > 0 ? (
              <RankingPodium
                boardLabel={activeTab.label}
                boardType={activeTab.boardType}
                items={podiumItems}
                periodLabel={periodLabel}
                timeWindow={timeWindow}
              />
            ) : null}

            {listItems.length > 0 ? (
              <RankingList
                boardLabel={activeTab.label}
                boardType={activeTab.boardType}
                items={listItems}
                periodLabel={periodLabel}
                timeWindow={timeWindow}
              />
            ) : null}

            <RankingPagination onPageChange={setPage} page={page} totalPages={totalPages} />
          </>
        )}
      </section>

      {isBoostedBoard && boostedPage ? <RecommendationTicketsInfo /> : null}

      {!loading && !error ? (
        <RankingScoringExplainer variant={isBoostedBoard ? "boosted" : "default"} />
      ) : null}
    </div>
  );
}

function RecommendedRankingHero({
  snapshotAt,
  totalCount,
  ticketBalance = 0,
  showTicketBalance = false
}: {
  snapshotAt?: string | null;
  totalCount?: number;
  ticketBalance?: number;
  showTicketBalance?: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-[var(--surface)] px-4 py-5 sm:px-6 sm:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.16),transparent_55%)]"
      />
      <div className="relative space-y-2">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-amber-200/90">
          Bảng xếp hạng
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Bảng xếp hạng Được đề cử
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-[0.95rem]">
          Những truyện được độc giả dùng Phiếu đề cử ủng hộ nhiều nhất.
        </p>
        {showTicketBalance ? (
          <RecommendationTicketBalance balance={ticketBalance} className="pt-1" />
        ) : null}
        {(snapshotAt || (totalCount ?? 0) > 0) && (
          <p className="text-xs text-zinc-500">
            {snapshotAt ? `Cập nhật ${formatRankingSnapshotTime(snapshotAt)}` : null}
            {snapshotAt && (totalCount ?? 0) > 0 ? " · " : null}
            {(totalCount ?? 0) > 0 ? `${totalCount} truyện` : null}
          </p>
        )}
      </div>
    </section>
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
          ? "border-yellow-400/35 bg-yellow-500/15 text-yellow-100"
          : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
