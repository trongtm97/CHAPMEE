import Link from "next/link";
import { AppSearchBar } from "@/components/ui/AppSearchBar";
import { SearchClickLink } from "@/components/search/SearchClickLink";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { Card, ErrorState } from "@/components/ui";
import { searchAll } from "@/lib/search/search-all";
import type { SearchFilterType } from "@/types/search";

const TABS: Array<{ id: SearchFilterType; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "story", label: "Truyện" },
  { id: "author", label: "Tác giả" },
  { id: "chapter", label: "Chương" },
  { id: "content_post", label: "Bài viết" }
];

function buildSearchHref(query: string, type: string, page = 1) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type && type !== "all") params.set("type", type);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function typeLabel(resultType: string) {
  switch (resultType) {
    case "story":
      return "Truyện";
    case "chapter":
      return "Chương";
    case "author":
      return "Tác giả";
    case "content_post":
      return "Bài viết";
    case "tag":
      return "Thẻ";
    case "category":
      return "Thể loại";
    default:
      return resultType;
  }
}

type SearchPageViewProps = {
  query: string;
  type: string;
  page: number;
  genre?: string;
};

export async function SearchPageView({
  query,
  type,
  page,
  genre
}: SearchPageViewProps) {
  const filterType = (TABS.some((tab) => tab.id === type) ? type : "all") as SearchFilterType;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const result = query
    ? await searchAll(query, { type: filterType, page: safePage, pageSize: 20, genre })
    : null;

  return (
    <ResponsivePageContainer className="py-6 md:py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <h1 className="page-title">Tìm kiếm</h1>
          <AppSearchBar catalogNavigation defaultValue={query} />
        </header>

        {query ? (
          <nav className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count =
                tab.id === "all"
                  ? Object.values(result?.countsByType ?? {}).reduce((s, n) => s + (n ?? 0), 0)
                  : (result?.countsByType?.[tab.id] ?? 0);
              const active = filterType === tab.id;
              return (
                <Link
                  className={`tap-highlight rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-[var(--surface)] text-zinc-300 hover:border-white/20"
                  }`}
                  href={buildSearchHref(query, tab.id)}
                  key={tab.id}
                >
                  {tab.label}
                  {count > 0 ? ` (${count})` : ""}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {!query ? (
          <Card className="text-sm text-zinc-400">
            Nhập từ khóa để tìm truyện, tác giả (@username), chương hoặc bài viết.
          </Card>
        ) : null}

        {result?.error ? (
          <ErrorState message={result.error} title="Không tìm được kết quả" />
        ) : null}

        {result && !result.error && result.items.length === 0 ? (
          <Card className="text-sm text-zinc-400">
            Không có kết quả phù hợp với &quot;{query}&quot;. Thử từ khóa ngắn hơn hoặc tên tác giả
            (@username).
          </Card>
        ) : null}

        {result && result.items.length > 0 ? (
          <ul className="space-y-3">
            {result.items.map((item, index) => (
              <li key={`${item.resultType}-${item.id}`}>
                <SearchClickLink
                  algorithmVersion={result.algorithmVersion}
                  className="tap-highlight chap-card-soft block rounded-xl p-4 transition hover:border-cyan-300/25"
                  href={item.href}
                  itemId={item.id}
                  position={index}
                  query={result.query}
                  requestId={result.requestId}
                  resultType={item.resultType}
                >
                  <div className="flex gap-3">
                    {item.imageUrl ? (
                      <img
                        alt=""
                        className="size-14 shrink-0 rounded-lg object-cover"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-zinc-500">
                        {typeLabel(item.resultType).slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-white">{item.title}</p>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                          {typeLabel(item.resultType)}
                        </span>
                        {item.exactMatchScore >= 0.88 ? (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                            Khớp chính xác
                          </span>
                        ) : null}
                      </div>
                      {item.subtitle ? (
                        <p className="mt-0.5 truncate text-sm text-zinc-400">{item.subtitle}</p>
                      ) : null}
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.description}</p>
                      ) : null}
                    </div>
                  </div>
                </SearchClickLink>
              </li>
            ))}
          </ul>
        ) : null}

        {result && result.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="text-zinc-500">
              Trang {result.page}/{result.totalPages} · {result.totalCount} kết quả
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link
                  className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-zinc-200"
                  href={buildSearchHref(query, filterType, result.page - 1)}
                >
                  Trước
                </Link>
              ) : null}
              {result.page < result.totalPages ? (
                <Link
                  className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-zinc-200"
                  href={buildSearchHref(query, filterType, result.page + 1)}
                >
                  Sau
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </ResponsivePageContainer>
  );
}
