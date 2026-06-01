"use client";

import Link from "next/link";
import { DEFAULT_NOINDEX_ROUTE_PATTERNS } from "@/lib/seo/noindex";
import { childSitemapPaths } from "@/lib/seo/sitemap-segments";

const SEGMENT_LABELS: Record<string, string> = {
  static: "Trang tĩnh",
  stories: "Truyện",
  chapters: "Chương",
  taxonomy: "Taxonomy",
  authors: "Tác giả",
  posts: "Bài viết & thông báo",
  policies: "Chính sách",
  reels: "Reels"
};

export function SeoRobotsSitemapPanel() {
  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://chapmee.com";

  const robotsPreview = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /studio
Disallow: /me
Disallow: /settings
Disallow: /messages
Disallow: /notifications
Disallow: /wallet
Disallow: /coin
Sitemap: ${siteUrl}/sitemap.xml`;

  const childSitemaps = childSitemapPaths();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">robots.txt preview</h2>
          <Link
            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            href="/robots.txt"
            rel="noopener noreferrer"
            target="_blank"
          >
            Mở file →
          </Link>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-zinc-950 p-4 text-xs text-zinc-300">
          {robotsPreview}
        </pre>
        <p className="mt-3 text-xs text-zinc-500">
          Admin, Studio, trang riêng tư, auth, wallet, messages, notifications mặc định disallow.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Sitemap index</h2>
          <Link
            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            href="/sitemap.xml"
            rel="noopener noreferrer"
            target="_blank"
          >
            Xem index →
          </Link>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          Chỉ URL canonical indexable. Taxonomy, truyện, chương, bài viết tách file con — không
          filter query, không UUID.
        </p>
        <ul className="mt-4 space-y-2">
          {childSitemaps.map((child) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-zinc-950 px-3 py-2 text-sm"
              key={child.id}
            >
              <span className="text-zinc-300">{SEGMENT_LABELS[child.id] ?? child.id}</span>
              <Link
                className="font-mono text-xs text-cyan-300 hover:underline"
                href={child.path}
                rel="noopener noreferrer"
                target="_blank"
              >
                {child.path}
              </Link>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Loại trừ mặc định</dt>
            <dd className="text-zinc-400">
              {DEFAULT_NOINDEX_ROUTE_PATTERNS.slice(0, 6)
                .map((item) => item.pattern)
                .join(", ")}
              …
            </dd>
          </div>
        </dl>
        <Link
          className="mt-4 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/seo?tab=taxonomy"
        >
          Quản trị Taxonomy SEO →
        </Link>
      </section>
    </div>
  );
}
