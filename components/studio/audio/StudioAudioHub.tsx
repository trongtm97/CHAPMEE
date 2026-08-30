import Link from "next/link";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { StudioStoryNavigatePicker } from "@/components/studio/shared/StudioStoryNavigatePicker";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioAudioHubData,
  StudioAudioHubItem,
  StudioAudioHubStatusFilter
} from "@/lib/studio/get-studio-audio-hub";
import { STUDIO_CHAPTER_PAGE_SIZES } from "@/types/studio";
import type { StoryQuickPickItem } from "@/types/studio-import";

type StudioAudioHubProps = {
  activeStatus: StudioAudioHubStatusFilter;
  activeStoryId: string;
  basePath: string;
  data: StudioAudioHubData;
  pickerStories: StoryQuickPickItem[];
  pickerTotal: number;
  query: Record<string, string | undefined>;
  search: string;
};

function statusLabel(status: StudioAudioHubItem["status"]) {
  const map: Record<StudioAudioHubItem["status"], string> = {
    draft: "Nháp",
    pending_review: "Chờ duyệt",
    published: "Đã đăng",
    hidden: "Ẩn",
    broken: "Lỗi link",
    rejected: "Từ chối",
    copyright_disputed: "Tranh chấp"
  };
  return map[status] ?? status;
}

function sourceLabel(source: StudioAudioHubItem["audio_source_type"]) {
  return source === "external_audio_url" ? "Link audio" : "YouTube";
}

const STATUS_TABS: Array<{ id: StudioAudioHubStatusFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "published", label: "Đã đăng" },
  { id: "draft", label: "Nháp" },
  { id: "pending_review", label: "Chờ duyệt" }
];

export function StudioAudioHub({
  activeStatus,
  activeStoryId,
  basePath,
  data,
  pickerStories,
  pickerTotal,
  query,
  search
}: StudioAudioHubProps) {
  const hasActiveFilters = Boolean(search || activeStoryId || activeStatus !== "all");

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">Studio</p>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Audio</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-400">
          Quản lý audio companion cho toàn bộ truyện. Audio gắn ở cấp truyện — chọn truyện để thêm
          hoặc sửa chi tiết.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <dt className="text-xs text-zinc-500">Tổng audio</dt>
          <dd className="mt-1 text-2xl font-bold text-white">{data.summary.total}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <dt className="text-xs text-zinc-500">Đã đăng</dt>
          <dd className="mt-1 text-2xl font-bold text-emerald-300">{data.summary.published}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <dt className="text-xs text-zinc-500">Nháp</dt>
          <dd className="mt-1 text-2xl font-bold text-amber-200">{data.summary.draft}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <dt className="text-xs text-zinc-500">Chờ duyệt</dt>
          <dd className="mt-1 text-2xl font-bold text-sky-300">{data.summary.pendingReview}</dd>
        </div>
      </dl>

      <StudioStoryNavigatePicker
        actionLabel="Mở trang audio truyện"
        buildHref={(storyId) => studioPath(`/stories/${storyId}/audio`)}
        emptyHint="Chưa có truyện. Tạo truyện mới trước khi thêm audio."
        initialStories={pickerStories}
        totalStories={pickerTotal}
      />

      <form
        action={basePath}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_8rem_auto]"
        method="get"
      >
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Tìm kiếm</span>
          <AppSearchField
            defaultValue={search}
            placeholder="Tiêu đề audio, tên truyện…"
            variant="field"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Mỗi trang</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            defaultValue={String(data.pageSize)}
            name="pageSize"
          >
            {STUDIO_CHAPTER_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          {activeStatus !== "all" ? (
            <input name="status" type="hidden" value={activeStatus} />
          ) : null}
          {activeStoryId ? <input name="story" type="hidden" value={activeStoryId} /> : null}
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-zinc-950"
            type="submit"
          >
            Áp dụng
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-300"
            href={basePath}
          >
            Xóa lọc
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.id}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              activeStatus === tab.id
                ? "bg-cyan-400 text-zinc-950"
                : "border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
            }`}
            href={buildStudioManagerHref(basePath, {
              ...query,
              page: undefined,
              status: tab.id === "all" ? undefined : tab.id
            })}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {data.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {data.error}
        </p>
      ) : null}

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
          <p className="text-sm text-zinc-400">
            {hasActiveFilters
              ? "Không có audio phù hợp bộ lọc."
              : "Chưa có audio. Chọn truyện ở trên để thêm audio đầu tiên."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Hiển thị {data.items.length} / {data.total} audio
          </p>
          {data.items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium text-cyan-200/90">{item.storyTitle}</p>
                  <h2 className="text-base font-semibold text-white">
                    {item.part_number != null ? `Phần ${item.part_number}: ` : ""}
                    {item.title}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {sourceLabel(item.audio_source_type)} · {statusLabel(item.status)}
                  </p>
                </div>
                <Link
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                  href={studioPath(`/stories/${item.story_id}/audio`)}
                >
                  Quản lý
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {data.totalPages > 1 ? (
        <StudioPagination
          buildHref={(page) =>
            buildStudioManagerHref(basePath, {
              ...query,
              page: page === 1 ? undefined : String(page)
            })
          }
          page={data.page}
          totalPages={data.totalPages}
        />
      ) : null}
    </section>
  );
}
