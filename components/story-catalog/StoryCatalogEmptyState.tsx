import Link from "next/link";
import { getCatalogClearHref } from "@/lib/stories/story-filters";

type StoryCatalogEmptyStateProps = {
  query?: string;
};

export function StoryCatalogEmptyState({ query = "" }: StoryCatalogEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-[var(--surface-soft)] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-zinc-200">Không tìm thấy truyện phù hợp.</p>
      <p className="mt-1 text-xs text-zinc-500">Hãy thử xóa bớt bộ lọc hoặc đổi từ khóa.</p>
      <Link
        className="mt-4 inline-flex h-9 items-center rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15"
        href={getCatalogClearHref(query)}
      >
        Xóa tất cả bộ lọc
      </Link>
    </div>
  );
}
