import Link from "next/link";
import type { Metadata } from "next";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import {
  AnnouncementPriorityBadge,
  AnnouncementTypeBadge,
  getAnnouncementAccentClass
} from "@/components/admin/announcements/AnnouncementBadges";
import { buildSeoMetadata } from "@/lib/platform-content";
import { listAnnouncements } from "@/lib/platform-content/announcements";
import {
  ANNOUNCEMENT_TYPE_FILTER_OPTIONS,
  buildPublicAnnouncementListQuery
} from "@/lib/platform-content/parse-announcement-filters";
import { createExcerpt } from "@/lib/text/createExcerpt";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ page?: string; type?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    pathname: "/thong-bao",
    pageType: "announcement_catalog",
    title: "Thông báo ChapMee",
    description: "Thông báo chính thức từ nền tảng ChapMee.",
    indexableOverride: true
  });
}

export default async function AnnouncementsIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pageRaw = Number(params.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const typeRaw = params.type ?? "all";
  const announcementType = ANNOUNCEMENT_TYPE_FILTER_OPTIONS.some((item) => item.value === typeRaw)
    ? typeRaw
    : "all";

  const { items, total, error } = await listAnnouncements({
    publicOnly: true,
    page,
    pageSize: PAGE_SIZE,
    sort: "published",
    announcementType: announcementType as "all" | import("@/types/platform-content").AnnouncementType
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Thông báo ChapMee</h1>
          <p className="text-muted-foreground">
            Cập nhật chính sách, bảo trì và thông tin quan trọng từ nền tảng.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {ANNOUNCEMENT_TYPE_FILTER_OPTIONS.map((option) => {
            const active = announcementType === option.value;
            const href = `/thong-bao${buildPublicAnnouncementListQuery({
              type: option.value === "all" ? undefined : option.value
            })}`;

            return (
              <Link
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-100"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                href={href}
                key={option.value}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {error ? (
          <p className="text-sm text-red-300">Không thể tải danh sách thông báo.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có thông báo công khai.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  className={`block py-5 transition hover:bg-muted/30 ${getAnnouncementAccentClass(item)}`}
                  href={`/thong-bao/${item.slug}`}
                >
                  <article className="space-y-2 px-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <AnnouncementTypeBadge type={item.announcement_type} />
                      <AnnouncementPriorityBadge priority={item.priority} />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {createExcerpt(item.body ?? "", 20, 40)}
                    </p>
                    {item.published_at ? (
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.published_at).toLocaleDateString("vi-VN")}
                      </p>
                    ) : null}
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Trang {page}/{totalPages}
            </span>
            <div className="flex gap-3">
              {page > 1 ? (
                <Link
                  href={`/thong-bao${buildPublicAnnouncementListQuery({
                    page: page - 1,
                    type: announcementType === "all" ? undefined : announcementType
                  })}`}
                >
                  Trước
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`/thong-bao${buildPublicAnnouncementListQuery({
                    page: page + 1,
                    type: announcementType === "all" ? undefined : announcementType
                  })}`}
                >
                  Sau
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </div>
    </ResponsivePageContainer>
  );
}
