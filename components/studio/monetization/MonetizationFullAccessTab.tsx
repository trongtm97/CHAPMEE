"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, EmptyState, LoadingState } from "@/components/ui";
import { MonetizationConfirmModal } from "@/components/studio/monetization/MonetizationConfirmModal";
import { MonetizationToast } from "@/components/studio/monetization/MonetizationToast";
import { StoryMonetizationSettingsSheet } from "@/components/studio/monetization/StoryMonetizationSettingsSheet";
import { formatMonetizationCoin, formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import {
  studioBulkMonetizationAction,
  studioFetchMonetizationStoriesAction
} from "@/lib/studio/studio-monetization-actions";
import type { StudioMonetizationConfigView, StudioStoryMonetizationRow } from "@/types/studio-monetization";

type MonetizationFullAccessTabProps = {
  canConfigure: boolean;
  config: StudioMonetizationConfigView;
  storiesTotalCount: number;
};

export function MonetizationFullAccessTab({
  canConfigure,
  config,
  storiesTotalCount
}: MonetizationFullAccessTabProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StudioStoryMonetizationRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingStory, setEditingStory] = useState<StudioStoryMonetizationRow | null>(null);
  const [pendingDisable, setPendingDisable] = useState<StudioStoryMonetizationRow | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );

  const load = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      const result = await studioFetchMonetizationStoriesAction({
        page,
        pageSize: 25,
        search: search.trim(),
        filter: "full_access_on",
        sort: "updated"
      });
      setRows(result.rows);
      setLoading(false);
    });
  }, [page, search]);

  useEffect(() => {
    if (storiesTotalCount === 0) {
      setLoading(false);
      return;
    }
    load();
  }, [load, storiesTotalCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  function bulkEnable() {
    startTransition(async () => {
      const all = await studioFetchMonetizationStoriesAction({
        page: 1,
        pageSize: 100,
        search: "",
        filter: "full_access_off",
        sort: "reads"
      });
      const ids = all.rows.slice(0, 25).map((row) => row.storyId);
      if (ids.length === 0) {
        setToast({ message: "Không có truyện để bật.", variant: "error" });
        return;
      }
      const result = await studioBulkMonetizationAction({
        scope: "selected",
        selectedStoryIds: ids,
        action: "enable_full_access"
      });
      setToast({
        message: result.successCount > 0 ? `Đã bật ${result.successCount} truyện.` : result.error ?? "Lỗi",
        variant: result.successCount > 0 ? "success" : "error"
      });
      load();
    });
  }

  return (
    <>
      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-400">
        Bán trọn bộ cho phép độc giả trả một lần để đọc toàn bộ chương hiện tại và chương tương lai.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm truyện đang bán trọn bộ…"
          type="search"
          value={search}
        />
        <Button
          disabled={!canConfigure || isPending}
          onClick={bulkEnable}
          type="button"
          variant="secondary"
        >
          Bật trọn bộ hàng loạt
        </Button>
      </div>

      {loading ? <LoadingState label="Đang tải…" /> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          description="Bật bán trọn bộ tại tab Truyện trả phí hoặc trong cài đặt từng truyện."
          title="Chưa có truyện bán trọn bộ"
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((story) => (
            <li
              className="flex flex-col gap-2 rounded-lg border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={story.storyId}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{story.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {story.isCompleted ? "Hoàn thành" : "Đang viết"} ·{" "}
                  {story.fullAccessPriceCoin != null
                    ? formatMonetizationCoin(story.fullAccessPriceCoin, config.coinDisplayName)
                    : "—"}{" "}
                  · Doanh thu {formatMonetizationVnd(story.revenueVnd)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  className="!min-h-9 !px-2.5 !py-1.5 !text-xs !normal-case"
                  disabled={!canConfigure}
                  onClick={() => setEditingStory(story)}
                  type="button"
                  variant="secondary"
                >
                  Sửa giá
                </Button>
                <Button
                  className="!min-h-9 !px-2.5 !py-1.5 !text-xs !normal-case"
                  disabled={!canConfigure}
                  onClick={() => setPendingDisable(story)}
                  type="button"
                  variant="ghost"
                >
                  Tắt bán
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {editingStory ? (
        <StoryMonetizationSettingsSheet
          canConfigure={canConfigure}
          config={config}
          onClose={() => setEditingStory(null)}
          onSaved={(message) => {
            setEditingStory(null);
            setToast({ message, variant: "success" });
            load();
          }}
          story={editingStory}
        />
      ) : null}

      <MonetizationConfirmModal
        confirmLabel="Tắt bán trọn bộ"
        description={
          pendingDisable
            ? `Tắt bán trọn bộ cho "${pendingDisable.title}". Người đã mua trước đó vẫn giữ quyền đọc. Doanh thu tương lai từ trọn bộ sẽ dừng.`
            : ""
        }
        destructive
        onCancel={() => setPendingDisable(null)}
        onConfirm={() => {
          if (!pendingDisable) return;
          startTransition(async () => {
            await studioBulkMonetizationAction({
              scope: "selected",
              selectedStoryIds: [pendingDisable.storyId],
              action: "disable_full_access"
            });
            setPendingDisable(null);
            setToast({ message: "Đã tắt bán trọn bộ.", variant: "success" });
            load();
          });
        }}
        open={Boolean(pendingDisable)}
        pending={isPending}
        title="Xác nhận tắt bán trọn bộ"
      />

      <MonetizationToast
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
        variant={toast?.variant}
      />
    </>
  );
}
