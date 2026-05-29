import Link from "next/link";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { StudioDraftRow } from "@/components/studio/StudioDraftRow";
import { EmptyState, Input, Button } from "@/components/ui";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type { StudioDraftListFilter, StudioDraftListItem } from "@/types/drafts";

const DRAFT_TYPE_LABELS: Record<StudioDraftListItem["draftType"], string> = {
  chapter: "Chương",
  seo: "SEO",
  story: "Truyện",
  swipe: "Swipe",
  template: "Mẫu"
};

const TABS: Array<{ label: string; value: StudioDraftListFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Truyện", value: "story" },
  { label: "Chương", value: "chapter" },
  { label: "Swipe", value: "swipe" },
  { label: "SEO", value: "seo" }
];

type StudioDraftsPageProps = {
  drafts: StudioDraftListItem[];
  counts: Record<StudioDraftListFilter, number>;
  activeFilter: StudioDraftListFilter;
  search: string;
  page: number;
  totalPages: number;
  query: Record<string, string | undefined>;
  hasActiveFilters: boolean;
};

export function StudioDraftsPage({
  activeFilter,
  counts,
  drafts,
  hasActiveFilters,
  page,
  query,
  search,
  totalPages
}: StudioDraftsPageProps) {
  const basePath = studioPath("/drafts");

  return (
    <div className="space-y-6">
      <form
        action={basePath}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
        method="get"
      >
        <Input
          defaultValue={search}
          label="Tìm kiếm"
          name="q"
          placeholder="Tìm theo tiêu đề hoặc truyện..."
        />
        {activeFilter !== "all" ? (
          <input name="type" type="hidden" value={activeFilter} />
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

      <StudioManagerTabs
        active={activeFilter}
        basePath={basePath}
        counts={counts}
        filterParam="type"
        query={query}
        tabs={TABS}
      />

      {drafts.length === 0 ? (
        <EmptyState
          description={
            hasActiveFilters
              ? "Thử đổi từ khóa hoặc bộ lọc khác."
              : "Nội dung bạn đang viết sẽ xuất hiện ở đây sau khi autosave."
          }
          title={hasActiveFilters ? "Không có nháp phù hợp" : "Chưa có nháp nào"}
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <StudioDraftRow
              draft={draft}
              key={draft.id}
              typeLabel={DRAFT_TYPE_LABELS[draft.draftType]}
            />
          ))}
        </div>
      )}

      <StudioPagination
        buildHref={(nextPage) =>
          buildStudioManagerHref(basePath, { ...query, page: String(nextPage) })
        }
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
