import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioChapterList } from "@/components/studio/StudioChapterList";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import { Button, ErrorState, Input, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioChapterSearch,
  getStudioChaptersPage,
  normalizeStudioChapterFilter,
  normalizeStudioChapterSort
} from "@/lib/studio/get-studio-chapters";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type { StudioChapterListFilter } from "@/types/studio";

type StudioChaptersPageProps = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{
    imported?: string;
    q?: string;
    skipped?: string;
    sort?: string;
    status?: string;
    page?: string;
  }>;
};

const CHAPTER_TABS: Array<{ label: string; value: StudioChapterListFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đã lên lịch", value: "scheduled" },
  { label: "Đã đăng", value: "published" },
  { label: "Cần sửa", value: "rejected" },
  { label: "Đã ẩn", value: "hidden" }
];

export const dynamic = "force-dynamic";

function canViewPublicStory(
  status: string,
  visibility: "public" | "private"
) {
  return (
    (status === "published" || status === "approved") && visibility === "public"
  );
}

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
  const basePath = studioPath(`/stories/${storyId}/chapters`);
  const query = {
    page: queryParams.page,
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
    search,
    sort: activeSort
  });

  if (!data.story && !data.error) {
    notFound();
  }

  if (!data.story) {
    return (
      <section className="space-y-6">
        <ErrorState message={data.error} title="Không tải được danh sách chương" />
      </section>
    );
  }

  const story = data.story;
  const hasActiveFilters =
    Boolean(search) ||
    activeFilter !== "all" ||
    Boolean(queryParams.page);
  const publicHref = `/stories/${story.slug}`;

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href={studioPath("/stories")}
      >
        ← Truyện của tôi
      </Link>

      {importNotice ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {importNotice} Bạn có thể kiểm tra và chỉnh sửa trước khi đăng.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="line-clamp-2 text-2xl font-black text-white sm:text-3xl">
            {story.title}
          </h1>
          <StudioStatusBadge kind="story" status={story.displayStatus} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={studioPath(`/stories/${storyId}/chapters/new`)}
          >
            Viết chương mới
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            href={studioPath(`/stories/${storyId}/import`)}
          >
            Nhập hàng loạt
          </Link>
          {canViewPublicStory(story.status, story.visibility) ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
              href={publicHref}
            >
              Xem trang truyện
            </Link>
          ) : null}
        </div>
      </div>

      <form
        action={basePath}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_10rem_auto_auto]"
        method="get"
      >
        <Input
          defaultValue={search}
          label="Tìm kiếm"
          name="q"
          placeholder="Tìm chương..."
        />
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Sắp xếp</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            defaultValue={activeSort === "number_asc" ? "number_asc" : activeSort}
            name="sort"
          >
            <option value="number_asc">Số chương tăng dần</option>
            <option value="number_desc">Số chương giảm dần</option>
            <option value="updated">Cập nhật gần nhất</option>
            <option value="scheduled">Lịch đăng gần nhất</option>
          </select>
        </label>
        {activeFilter !== "all" ? (
          <input name="status" type="hidden" value={activeFilter} />
        ) : null}
        <div className="flex items-end gap-2">
          <Button className="flex-1" type="submit">
            Tìm
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            href={basePath}
          >
            Xóa lọc
          </Link>
        </div>
      </form>

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được danh sách chương" />
      ) : null}

      <StudioManagerTabs
        active={activeFilter}
        basePath={basePath}
        counts={data.counts}
        query={query}
        tabs={CHAPTER_TABS}
      />

      <StudioChapterList
        chapters={data.chapters}
        hasActiveFilters={hasActiveFilters}
        storyId={storyId}
        storySlug={story.slug}
      />

      <StudioPagination
        buildHref={(page) =>
          buildStudioManagerHref(basePath, { ...query, page: String(page) })
        }
        page={data.page}
        totalPages={data.totalPages}
      />
    </section>
  );
}
