"use client";

import Link from "next/link";
import type { SeoSitemapStats } from "@/types/admin-seo";

type Props = {
  stats: SeoSitemapStats;
};

const BREAKDOWN_LABELS: Record<string, string> = {
  static: "Trang tĩnh",
  stories: "Truyện",
  chapters: "Chương",
  taxonomy: "Taxonomy",
  authors: "Tác giả",
  posts: "Bài viết / thông báo",
  policies: "Chính sách",
  reels: "Reels",
  other: "Khác"
};

export function SeoSitemapTab({ stats }: Props) {
  const sitemapUrl =
    typeof window !== "undefined" ? `${window.location.origin}${stats.url}` : stats.url;

  function copyUrl() {
    void navigator.clipboard.writeText(sitemapUrl);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3">
          <p className="text-2xl font-bold text-white">{stats.totalUrls}</p>
          <p className="text-xs text-zinc-500">Tổng URL</p>
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-4 py-3">
          <p className="text-2xl font-bold text-emerald-100">{stats.indexedUrls}</p>
          <p className="text-xs text-zinc-500">URL được index</p>
        </div>
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
          <p className="text-2xl font-bold text-amber-100">{stats.excludedUrls}</p>
          <p className="text-xs text-zinc-500">URL loại trừ</p>
        </div>
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3">
          <p className="text-2xl font-bold text-red-100">{stats.errorCount}</p>
          <p className="text-xs text-zinc-500">Lỗi</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Sitemap</h2>
            <p className="mt-1 font-mono text-sm text-cyan-100">{stats.url}</p>
            {stats.lastGenerated ? (
              <p className="mt-1 text-xs text-zinc-500">
                Cập nhật gần nhất: {new Date(stats.lastGenerated).toLocaleString("vi-VN")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-cyan-300 hover:bg-white/5"
              href={stats.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Xem sitemap
            </Link>
            <button
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
              onClick={copyUrl}
              type="button"
            >
              Sao chép URL
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-400">
          Sitemap index tại <span className="font-mono text-cyan-200">/sitemap.xml</span> trỏ tới
          các file con (stories, chapters, taxonomy, …). Chỉ URL canonical indexable — không filter
          query, không UUID.
        </p>

        {stats.childSitemaps.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {stats.childSitemaps.map((child) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-zinc-950 px-3 py-2"
                key={child.id}
              >
                <span className="font-mono text-cyan-100">{child.path}</span>
                <span className="text-zinc-400">{child.urlCount} URL</span>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-400"
          disabled
          title="Sitemap sinh động qua Next.js — regenerate thủ công sẽ nối sau"
          type="button"
        >
          Tạo lại sitemap (sinh động)
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <h3 className="font-semibold text-white">Phân loại URL</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.breakdown).map(([key, count]) => (
            <div className="rounded-lg border border-white/5 bg-zinc-950 px-3 py-2" key={key}>
              <dt className="text-xs text-zinc-500">{BREAKDOWN_LABELS[key] ?? key}</dt>
              <dd className="text-lg font-semibold text-white">{count}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
