"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StudioStoriesConfirmModal } from "@/components/studio/stories/StudioStoriesConfirmModal";
import { StudioStoriesToast } from "@/components/studio/stories/StudioStoriesToast";
import {
  storiesBtnCompactPrimary,
  storiesBtnCompactSecondary,
  storiesBtnDanger,
  storiesBtnGhost
} from "@/components/studio/stories/shared/styles";
import {
  bulkAddGenreAction,
  bulkApplyTaxonomyTermsAction,
  bulkRemoveTaxonomyTermsAction,
  bulkDeleteStoriesAction,
  bulkHideStoriesAction,
  bulkMarkCompletedAction,
  bulkMoveToDraftAction,
  bulkUnhideStoriesAction,
  exportStoriesTaxonomyV2Action
} from "@/lib/studio/stories-bulk-actions";
import type { StudioStoryGenreOption } from "@/types/studio-stories";
import type { StudioTaxonomyFilterOptions } from "@/lib/studio/get-studio-taxonomy-filters";

type PendingAction =
  | "hide"
  | "unhide"
  | "delete"
  | "complete"
  | "draft"
  | "genre"
  | "taxonomy"
  | "taxonomy_remove"
  | "taxonomy_replace";

type StudioStoriesBulkBarProps = {
  count: number;
  genres: StudioStoryGenreOption[];
  taxonomyOptions?: StudioTaxonomyFilterOptions | null;
  onClear: () => void;
  selectedIds: string[];
};

export function StudioStoriesBulkBar({
  count,
  genres,
  taxonomyOptions,
  onClear,
  selectedIds
}: StudioStoriesBulkBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [genreId, setGenreId] = useState("");
  const [taxonomyTermId, setTaxonomyTermId] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmText, setConfirmText] = useState("");

  function handleExportV2() {
    startTransition(async () => {
      const result = await exportStoriesTaxonomyV2Action(selectedIds);
      if (result.error || !result.csv) {
        setToast({ message: result.error ?? "Không xuất được.", variant: "error" });
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chapmee-taxonomy-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: `Đã xuất ${selectedIds.length} truyện (taxonomy).`, variant: "success" });
      setMoreOpen(false);
    });
  }

  if (count === 0) {
    return null;
  }

  function closeModal() {
    setPendingAction(null);
    setConfirmText("");
  }

  function showResult(
    label: string,
    result: {
      ok: boolean;
      successCount: number;
      failedCount: number;
      error?: string;
    }
  ) {
    if (result.error && result.successCount === 0) {
      setToast({ message: result.error, variant: "error" });
      return;
    }

    const message =
      result.failedCount > 0
        ? `${label}: ${result.successCount} thành công, ${result.failedCount} thất bại.`
        : `${label} ${result.successCount} truyện.`;

    setToast({ message, variant: result.successCount > 0 ? "success" : "error" });

    if (result.successCount > 0) {
      onClear();
      router.refresh();
    }
  }

  function runAction(action: PendingAction) {
    startTransition(async () => {
      let result;

      switch (action) {
        case "hide":
          result = await bulkHideStoriesAction(selectedIds);
          showResult("Đã ẩn", result);
          break;
        case "unhide":
          result = await bulkUnhideStoriesAction(selectedIds);
          showResult("Đã hiện lại", result);
          break;
        case "delete":
          result = await bulkDeleteStoriesAction(selectedIds);
          showResult("Đã xóa", result);
          break;
        case "complete":
          result = await bulkMarkCompletedAction(selectedIds);
          showResult("Đã đánh dấu hoàn thành", result);
          break;
        case "draft":
          result = await bulkMoveToDraftAction(selectedIds);
          showResult("Đã chuyển về nháp", result);
          break;
        case "genre":
          result = await bulkAddGenreAction(selectedIds, genreId);
          showResult("Đã gắn thể loại cho", result);
          break;
        case "taxonomy":
          result = await bulkApplyTaxonomyTermsAction(
            selectedIds,
            taxonomyTermId ? [taxonomyTermId] : [],
            "add"
          );
          showResult("Đã gắn tag cho", result);
          break;
        case "taxonomy_remove":
          result = await bulkRemoveTaxonomyTermsAction(
            selectedIds,
            taxonomyTermId ? [taxonomyTermId] : []
          );
          showResult("Đã gỡ tag khỏi", result);
          break;
        case "taxonomy_replace":
          result = await bulkApplyTaxonomyTermsAction(
            selectedIds,
            taxonomyTermId ? [taxonomyTermId] : [],
            "replace"
          );
          showResult("Đã thay thế tag cho", result);
          break;
        default:
          break;
      }

      closeModal();
      setMoreOpen(false);
    });
  }

  const modalCopy: Record<
    PendingAction,
    {
      confirmLabel: string;
      description: string;
      destructive?: boolean;
      title: string;
      typed?: boolean;
    }
  > = {
    complete: {
      confirmLabel: "Đánh dấu hoàn thành",
      description: `Đánh dấu ${count} truyện đã hoàn thành?`,
      title: "Đánh dấu hoàn thành hàng loạt"
    },
    delete: {
      confirmLabel: "Xóa vĩnh viễn",
      description: `Xóa vĩnh viễn ${count} truyện nháp? Chỉ truyện nháp không có tương tác mới xóa được. Thao tác không hoàn tác.`,
      destructive: true,
      title: "Xóa truyện hàng loạt",
      typed: true
    },
    draft: {
      confirmLabel: "Chuyển về nháp",
      description: `Chuyển ${count} truyện về trạng thái nháp?`,
      title: "Chuyển về nháp hàng loạt"
    },
    genre: {
      confirmLabel: "Gắn thể loại",
      description: `Gắn thể loại đã chọn cho ${count} truyện?`,
      title: "Gắn thể loại hàng loạt"
    },
    taxonomy: {
      confirmLabel: "Gắn tag",
      description: `Thêm tag đã chọn vào ${count} truyện (giữ tag hiện có)?`,
      title: "Gắn tag taxonomy hàng loạt"
    },
    taxonomy_remove: {
      confirmLabel: "Gỡ tag",
      description: `Gỡ tag đã chọn khỏi ${count} truyện (các tag khác giữ nguyên)?`,
      title: "Gỡ tag taxonomy hàng loạt"
    },
    taxonomy_replace: {
      confirmLabel: "Thay thế",
      description: `Thay mọi tag cùng loại (ví dụ motif) bằng tag đã chọn trên ${count} truyện? Các loại taxonomy khác giữ nguyên.`,
      title: "Thay thế tag cùng loại"
    },
    hide: {
      confirmLabel: "Ẩn truyện",
      description: `Ẩn ${count} truyện khỏi ChapMee? Truyện sẽ chuyển sang trạng thái đã ẩn.`,
      title: "Ẩn truyện hàng loạt"
    },
    unhide: {
      confirmLabel: "Hiện lại",
      description: `Hiện lại ${count} truyện? Truyện sẽ về nháp để bạn kiểm tra trước khi đăng lại.`,
      title: "Hiện lại truyện hàng loạt"
    }
  };

  const modal = pendingAction ? modalCopy[pendingAction] : null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-[4.5rem] z-30 lg:static lg:inset-auto">
        <div className="rounded-2xl border border-cyan-300/30 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md lg:sticky lg:top-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Đã chọn {count} truyện</p>
            <button
              className={`${storiesBtnGhost} shrink-0 sm:w-auto`}
              disabled={isPending}
              onClick={onClear}
              type="button"
            >
              Bỏ chọn
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 lg:mt-0 lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-1.5">
            <button
              className={storiesBtnCompactPrimary}
              disabled={isPending}
              onClick={() => setPendingAction("hide")}
              type="button"
            >
              Ẩn
            </button>
            <button
              className={storiesBtnCompactSecondary}
              disabled={isPending}
              onClick={() => setPendingAction("unhide")}
              type="button"
            >
              Hiện lại
            </button>
            <button
              className={storiesBtnCompactSecondary}
              disabled={isPending}
              onClick={() => setPendingAction("complete")}
              type="button"
            >
              Hoàn thành
            </button>
            <button
              className={storiesBtnCompactSecondary}
              disabled={isPending}
              onClick={() => setPendingAction("draft")}
              type="button"
            >
              Về nháp
            </button>
            <div className="relative col-span-2 lg:col-span-1">
              <button
                className={storiesBtnCompactSecondary}
                disabled={isPending}
                onClick={() => setMoreOpen((value) => !value)}
                type="button"
              >
                Thêm thao tác
              </button>
              {moreOpen ? (
                <div className="absolute bottom-[calc(100%+0.35rem)] left-0 right-0 z-30 rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-xl lg:bottom-auto lg:left-auto lg:right-0 lg:top-[calc(100%+0.35rem)] lg:min-w-[12rem]">
                  {taxonomyOptions?.trope_tag?.length ||
                  taxonomyOptions?.mainGenres?.length ? (
                    <div className="border-b border-white/10 p-2">
                      <select
                        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
                        onChange={(event) => setTaxonomyTermId(event.target.value)}
                        value={taxonomyTermId}
                      >
                        <option value="">Chọn nhãn taxonomy</option>
                        {taxonomyOptions?.mainGenres?.length ? (
                          <optgroup label="Thể loại chính">
                            {taxonomyOptions.mainGenres.slice(0, 40).map((term) => (
                              <option key={term.id} value={term.id}>
                                {term.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {taxonomyOptions?.trope_tag?.length ? (
                          <optgroup label="Tag motif">
                            {taxonomyOptions.trope_tag.slice(0, 80).map((term) => (
                              <option key={term.id} value={term.id}>
                                {term.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                      <button
                        className={`${storiesBtnCompactSecondary} mt-2 w-full`}
                        disabled={!taxonomyTermId || isPending}
                        onClick={() => setPendingAction("taxonomy")}
                        type="button"
                      >
                        Gắn tag
                      </button>
                      <button
                        className={`${storiesBtnCompactSecondary} mt-2 w-full`}
                        disabled={!taxonomyTermId || isPending}
                        onClick={() => setPendingAction("taxonomy_remove")}
                        type="button"
                      >
                        Gỡ tag
                      </button>
                      <button
                        className={`${storiesBtnCompactSecondary} mt-2 w-full`}
                        disabled={!taxonomyTermId || isPending}
                        onClick={() => setPendingAction("taxonomy_replace")}
                        type="button"
                      >
                        Thay thế (cùng loại)
                      </button>
                    </div>
                  ) : null}
                  {genres.length > 0 ? (
                    <div className="border-b border-white/10 p-2">
                      <select
                        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
                        onChange={(event) => setGenreId(event.target.value)}
                        value={genreId}
                      >
                        <option value="">Chọn thể loại (legacy)</option>
                        {genres.map((genre) => (
                          <option key={genre.id} value={genre.id}>
                            {genre.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className={`${storiesBtnCompactSecondary} mt-2 w-full`}
                        disabled={!genreId || isPending}
                        onClick={() => setPendingAction("genre")}
                        type="button"
                      >
                        Gắn thể loại
                      </button>
                    </div>
                  ) : null}
                  <button
                    className={`${storiesBtnDanger} m-1 w-[calc(100%-0.5rem)]`}
                    disabled={isPending}
                    onClick={() => setPendingAction("delete")}
                    type="button"
                  >
                    Xóa
                  </button>
                  <button
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5"
                    disabled={isPending}
                    onClick={handleExportV2}
                    type="button"
                  >
                    Xuất CSV taxonomy
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <StudioStoriesConfirmModal
        confirmLabel={modal?.confirmLabel}
        confirmText={confirmText}
        confirmValueRequired={modal?.typed ? "XOA" : undefined}
        description={modal?.description ?? ""}
        destructive={modal?.destructive}
        onClose={closeModal}
        onConfirm={() => pendingAction && runAction(pendingAction)}
        onConfirmTextChange={setConfirmText}
        open={Boolean(pendingAction && modal)}
        title={modal?.title ?? ""}
      />

      <StudioStoriesToast
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
        variant={toast?.variant}
      />
    </>
  );
}
