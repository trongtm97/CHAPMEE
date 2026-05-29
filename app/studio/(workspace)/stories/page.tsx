import Link from "next/link";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { StudioStoryList } from "@/components/studio/StudioStoryList";
import { Button, ErrorState, Input, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioStoriesPage,
  getStudioStorySearch,
  normalizeStudioStoryFilter,
  normalizeStudioStorySort
} from "@/lib/studio/get-studio-stories";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  STUDIO_ACCESS_ERROR_TITLE,
  STUDIO_LOAD_STORIES_ERROR
} from "@/lib/studio/messages";
import { studioPath } from "@/lib/studio/constants";
import type { StudioStoryListFilter } from "@/types/studio";

type StudioStoriesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

const STORY_TABS: Array<{ label: string; value: StudioStoryListFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đang đăng", value: "live" },
  { label: "Đã lên lịch", value: "scheduled" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Cần sửa", value: "rejected" },
  { label: "Đã ẩn", value: "hidden" }
];

export const dynamic = "force-dynamic";

export default async function StudioStoriesPage({
  searchParams
}: StudioStoriesPageProps) {
  const params = await searchParams;
  const activeFilter = normalizeStudioStoryFilter(params.status);
  const search = getStudioStorySearch(params.q);
  const activeSort = normalizeStudioStorySort(params.sort);
  const basePath = studioPath("/stories");
  const query = {
    page: params.page,
    q: search || undefined,
    sort: activeSort === "updated" ? undefined : activeSort,
    status: activeFilter === "all" ? undefined : activeFilter
  };

  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Truyện của tôi" />
        <ErrorState message={error} title={STUDIO_ACCESS_ERROR_TITLE} />
      </section>
    );
  }

  const data = await getStudioStoriesPage(creatorProfile, {
    filter: activeFilter,
    page: params.page,
    search,
    sort: activeSort
  });

  const hasActiveFilters =
    Boolean(search) || activeFilter !== "all" || Boolean(params.page);

  return (
    <section className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
              href={studioPath("/import")}
            >
              Nhập hàng loạt
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
              href={studioPath("/stories/new")}
            >
              Tạo truyện mới
            </Link>
          </div>
        }
        subtitle="Quản lý truyện, chương và trạng thái xuất bản trên ChapMee."
        title="Truyện của tôi"
      />

      <form
        action={basePath}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_10rem_auto_auto]"
        method="get"
      >
        <Input
          defaultValue={search}
          label="Tìm kiếm"
          name="q"
          placeholder="Tìm truyện của bạn..."
        />
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Sắp xếp</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            defaultValue={activeSort}
            name="sort"
          >
            <option value="updated">Cập nhật gần nhất</option>
            <option value="created">Tạo mới nhất</option>
            <option value="reads">Lượt đọc cao nhất</option>
            <option value="title">Tên A–Z</option>
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
        <ErrorState message={data.error} title={STUDIO_LOAD_STORIES_ERROR} />
      ) : null}

      <StudioManagerTabs
        active={activeFilter}
        basePath={basePath}
        counts={data.counts}
        query={query}
        tabs={STORY_TABS}
      />

      <StudioStoryList hasActiveFilters={hasActiveFilters} stories={data.stories} />

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
