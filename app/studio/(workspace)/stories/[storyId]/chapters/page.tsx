import { notFound } from "next/navigation";
import { PresentationStoryHint } from "@/components/studio/presentation/PresentationStoryHint";
import { ChapterManagerAlerts } from "@/components/studio/chapters/manager/ChapterManagerAlerts";
import { ChapterManagerHeader } from "@/components/studio/chapters/manager/ChapterManagerHeader";
import { ChapterManagerWorkspace } from "@/components/studio/chapters/manager/ChapterManagerWorkspace";
import { StandaloneStoryManagerPanel } from "@/components/studio/chapters/manager/StandaloneStoryManagerPanel";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioChapterSearch,
  getStudioChaptersPage,
  normalizeStudioChapterFilter,
  normalizeStudioChapterPageSize,
  normalizeStudioChapterSort
} from "@/lib/studio/get-studio-chapters";
import { studioPath } from "@/lib/studio/constants";
import type { StudioChapterListFilter } from "@/types/studio";

type StudioChaptersPageProps = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{
    imported?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    reorder?: string;
    skipped?: string;
    sort?: string;
    status?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioChaptersPage({
  params,
  searchParams
}: StudioChaptersPageProps) {
  const { storyId } = await params;
  const queryParams = await searchParams;
  const importedCount = Number.parseInt(queryParams.imported ?? "", 10);
  const skippedCount = Number.parseInt(queryParams.skipped ?? "", 10);
  const importNotice =
    Number.isFinite(importedCount) && importedCount > 0
      ? skippedCount > 0
        ? `Đã nhập ${importedCount} chương vào nháp. ${skippedCount} chương bị bỏ qua do lỗi.`
        : `Đã nhập ${importedCount} chương vào nháp.`
      : null;

  const activeFilter = normalizeStudioChapterFilter(queryParams.status);
  const search = getStudioChapterSearch(queryParams.q);
  const activeSort = normalizeStudioChapterSort(queryParams.sort);
  const pageSize = normalizeStudioChapterPageSize(queryParams.pageSize);
  const basePath = studioPath(`/stories/${storyId}/chapters`);
  const query = {
    page: queryParams.page,
    pageSize: pageSize === 25 ? undefined : String(pageSize),
    q: search || undefined,
    sort: activeSort === "number_asc" ? undefined : activeSort,
    status: activeFilter === "all" ? undefined : activeFilter
  };

  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Quản lý chương" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioChaptersPage(creatorProfile, storyId, {
    filter: activeFilter,
    page: queryParams.page,
    pageSize: queryParams.pageSize,
    search,
    sort: activeSort
  });

  if (!data.story && !data.error) {
    notFound();
  }

  if (!data.story) {
    return (
      <section className="space-y-6">
        <ErrorState message={data.error} title="Không thể tải danh sách chương" />
      </section>
    );
  }

  const story = data.story;
  const hasActiveFilters =
    Boolean(search) ||
    activeFilter !== "all" ||
    Boolean(queryParams.page) ||
    pageSize !== 25;

  if (story.structureType === "standalone") {
    return (
      <section className="space-y-6">
        <StandaloneStoryManagerPanel story={story} storyId={storyId} />
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-24 lg:pb-6">
      <ChapterManagerHeader
        importNotice={importNotice}
        stats={data.stats}
        story={story}
        storyId={storyId}
      />

      <PresentationStoryHint presentationMode={story.presentationMode} storyId={storyId} />

      <ChapterManagerAlerts stats={data.stats} story={story} storyId={storyId} />

      {queryParams.reorder === "1" && data.stats?.orderDiagnostics ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-300">
          <p className="font-semibold text-white">Kiểm tra thứ tự chương</p>
          <p className="mt-2">
            {data.stats.orderDiagnostics.duplicateNumbers.length > 0
              ? `Trùng số: ${data.stats.orderDiagnostics.duplicateNumbers.join(", ")}. `
              : "Không có số trùng. "}
            {data.stats.orderDiagnostics.missingNumbers.length > 0
              ? `Thiếu số: ${data.stats.orderDiagnostics.missingNumbers.slice(0, 20).join(", ")}${data.stats.orderDiagnostics.missingNumbers.length > 20 ? "…" : ""}.`
              : "Dãy số liên tục."}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Tính năng kéo thả và tự đánh lại số chương sẽ có trong bản cập nhật tiếp theo. Hiện
            tại hãy sửa số chương từng mục trong editor.
          </p>
        </div>
      ) : null}

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được danh sách chương" />
      ) : null}

      <ChapterManagerWorkspace
        activeFilter={activeFilter as StudioChapterListFilter}
        activeSort={activeSort}
        basePath={basePath}
        chapters={data.chapters}
        counts={data.counts}
        hasActiveFilters={hasActiveFilters}
        page={data.page}
        pageSize={data.pageSize}
        query={query}
        search={search}
        stats={data.stats}
        story={story}
        storyId={storyId}
        totalPages={data.totalPages}
      />
    </section>
  );
}
