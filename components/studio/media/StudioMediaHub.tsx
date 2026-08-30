import Link from "next/link";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { StudioStoryNavigatePicker } from "@/components/studio/shared/StudioStoryNavigatePicker";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { CopyImageUrlButton } from "@/components/studio/media/CopyImageUrlButton";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioMediaHubData,
  StudioMediaHubFilmItem
} from "@/lib/studio/get-studio-media-hub";
import type { StudioHubMediaTab } from "@/lib/studio/studio-hub-filters";
import { STUDIO_CHAPTER_PAGE_SIZES } from "@/types/studio";
import type { LibraryImage } from "@/types/media-library";
import type { StoryQuickPickItem } from "@/types/studio-import";
import { buildYoutubeEmbedUrl } from "@/src/lib/audio/audio-url";

type StudioMediaHubProps = {
  activeStoryId: string;
  activeTab: StudioHubMediaTab;
  basePath: string;
  data: StudioMediaHubData;
  pickerStories: StoryQuickPickItem[];
  pickerTotal: number;
  query: Record<string, string | undefined>;
  search: string;
};

function filmStatusLabel(status: StudioMediaHubFilmItem["status"]) {
  const map: Record<StudioMediaHubFilmItem["status"], string> = {
    draft: "Nháp",
    pending_review: "Chờ duyệt",
    published: "Đã đăng",
    hidden: "Ẩn",
    rejected: "Từ chối",
    copyright_disputed: "Tranh chấp",
    unavailable: "Không khả dụng"
  };
  return map[status] ?? status;
}

function sourceBadge(source: LibraryImage["source"]) {
  return source === "chapter" ? "Chương" : "Tài sản";
}

export function StudioMediaHub({
  activeStoryId,
  activeTab,
  basePath,
  data,
  pickerStories,
  pickerTotal,
  query,
  search
}: StudioMediaHubProps) {
  const hasActiveFilters = Boolean(search || activeStoryId);
  const tabs: Array<{ id: StudioHubMediaTab; label: string; count: number }> = [
    { id: "images", label: "Ảnh", count: data.summary.imageCount },
    { id: "video", label: "Video / Phim", count: data.summary.filmCount }
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">Studio</p>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Media</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-400">
          Thư viện ảnh dùng trong chương, bài viết và truyện; quản lý video/phim chuyển thể theo
          truyện.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === item.id
                ? "bg-cyan-400 text-zinc-950"
                : "border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
            }`}
            href={buildStudioManagerHref(basePath, {
              ...query,
              page: undefined,
              tab: item.id === "images" ? undefined : item.id
            })}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-80">({item.count})</span>
          </Link>
        ))}
      </div>

      {activeTab === "images" ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-zinc-400">
            Ảnh được tải khi viết chương, soạn bài hoặc đặt bìa truyện sẽ xuất hiện ở đây. Chèn
            lại từ thư viện trong trình soạn TipTap hoặc hộp thoại chèn ảnh.
          </div>

          <form
            action={basePath}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_8rem_auto]"
            method="get"
          >
            <label className="block space-y-2 text-sm">
              <span className="font-semibold text-zinc-200">Tìm kiếm</span>
              <AppSearchField
                defaultValue={search}
                placeholder="Alt, caption, URL ảnh…"
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

          {data.images.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
              {hasActiveFilters
                ? "Không có ảnh phù hợp bộ lọc."
                : "Chưa có ảnh trong thư viện. Tải ảnh khi viết chương hoặc mô tả truyện."}
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Hiển thị {data.images.length} / {data.total} ảnh
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.images.map((image) => (
                  <figure
                    key={`${image.source}-${image.id}`}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={image.alt || "Ảnh thư viện"}
                      className="aspect-square w-full object-cover"
                      src={image.thumbUrl || image.url}
                    />
                    <figcaption className="space-y-2 p-3">
                      <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                        {sourceBadge(image.source)}
                      </span>
                      <p className="line-clamp-2 text-xs text-zinc-400">
                        {image.caption || image.alt || "Không có mô tả"}
                      </p>
                      <CopyImageUrlButton imageId={image.id} url={image.url} />
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <StudioStoryNavigatePicker
            actionLabel="Mở trang phim truyện"
            buildHref={(storyId) => studioPath(`/stories/${storyId}/films`)}
            initialStories={pickerStories}
            totalStories={pickerTotal}
          />

          <form
            action={basePath}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_8rem_auto]"
            method="get"
          >
            <input name="tab" type="hidden" value="video" />
            <label className="block space-y-2 text-sm">
              <span className="font-semibold text-zinc-200">Tìm kiếm</span>
              <AppSearchField
                defaultValue={search}
                placeholder="Tiêu đề video/phim, tên truyện…"
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
              {activeStoryId ? <input name="story" type="hidden" value={activeStoryId} /> : null}
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-zinc-950"
                type="submit"
              >
                Áp dụng
              </button>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-300"
                href={buildStudioManagerHref(basePath, { tab: "video" })}
              >
                Xóa lọc
              </Link>
            </div>
          </form>

          {data.films.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
              {hasActiveFilters
                ? "Không có video/phim phù hợp bộ lọc."
                : "Chưa có video/phim chuyển thể."}
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Hiển thị {data.films.length} / {data.total} video/phim
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.films.map((film) => (
                  <article
                    key={film.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
                  >
                    {film.youtube_video_id ? (
                      <iframe
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full bg-black"
                        src={buildYoutubeEmbedUrl(film.youtube_video_id) ?? undefined}
                        title={film.title}
                      />
                    ) : null}
                    <div className="space-y-2 p-4">
                      <p className="text-xs font-medium text-cyan-200/90">{film.storyTitle}</p>
                      <h2 className="text-base font-semibold text-white">{film.title}</h2>
                      <p className="text-xs text-zinc-500">{filmStatusLabel(film.status)}</p>
                      <Link
                        className="inline-flex rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                        href={studioPath(`/stories/${film.story_id}/films`)}
                      >
                        Quản lý
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {data.error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {data.error}
        </p>
      ) : null}

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
