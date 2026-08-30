"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { SeoRedirectsFilters } from "@/components/admin/seo/SeoRedirectsFilters";
import { SeoRedirectsList } from "@/components/admin/seo/SeoRedirectsList";
import { Button } from "@/components/ui";
import {
  createUrlRedirectAction,
  type UrlAdminDashboard
} from "@/lib/admin/url-seo-data";
import type { SeoRedirectRow } from "@/lib/db/schema/seo-center";

type TabId = "manual" | "slug";

type AdminRedirectsHubProps = {
  tab: TabId;
  seoRedirects: {
    items: SeoRedirectRow[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  urlData: UrlAdminDashboard;
  canUpdate: boolean;
};

const TABS: { id: TabId; label: string; description: string }[] = [
  {
    id: "manual",
    label: "Redirect thủ công",
    description: "seo_redirects — bất kỳ path nào, 301/302/307/308, hit tracking"
  },
  {
    id: "slug",
    label: "Đổi slug / URL",
    description: "url_redirects — tự động khi đổi slug truyện/chương"
  }
];

export function AdminRedirectsHub({
  tab,
  seoRedirects,
  urlData,
  canUpdate
}: AdminRedirectsHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourcePath, setSourcePath] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [slugMessage, setSlugMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "manual") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/admin/seo/redirects?${query}` : "/admin/seo/redirects");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              tab === item.id
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-zinc-500">{TABS.find((item) => item.id === tab)?.description}</p>

      {tab === "manual" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            {canUpdate ? (
              <Link href="/admin/seo/redirects/new">
                <Button>Tạo redirect</Button>
              </Link>
            ) : null}
          </div>

          <SeoRedirectsFilters />
          <SeoRedirectsList items={seoRedirects.items} />
          <AdminListPagination
            basePath="/admin/seo/redirects"
            page={seoRedirects.page}
            pageSize={seoRedirects.pageSize}
            total={seoRedirects.total}
            totalPages={seoRedirects.totalPages}
          />
        </>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-100">Cảnh báo URL</h2>
            {urlData.warnings.length === 0 ? (
              <p className="text-sm text-zinc-500">Không có cảnh báo.</p>
            ) : (
              <ul className="space-y-2">
                {urlData.warnings.map((warning) => (
                  <li
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      warning.severity === "critical"
                        ? "border-red-500/40 bg-red-500/10 text-red-100"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                    }`}
                    key={warning.id}
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canUpdate ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-100">Tạo redirect slug (url_redirects)</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  onChange={(event) => setSourcePath(event.target.value)}
                  placeholder="/truyen/old-slug-s.12345678"
                  value={sourcePath}
                />
                <input
                  className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  onChange={(event) => setTargetPath(event.target.value)}
                  placeholder="/truyen/new-slug-s.12345678"
                  value={targetPath}
                />
              </div>
              <button
                className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await createUrlRedirectAction({ sourcePath, targetPath });
                    setSlugMessage(result.ok ? "Đã tạo redirect 301." : result.error);
                  });
                }}
                type="button"
              >
                Tạo redirect 301
              </button>
              {slugMessage ? <p className="text-sm text-zinc-400">{slugMessage}</p> : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-100">
              Lịch sử slug ({urlData.redirects.length})
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="min-w-full text-sm">
                <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {urlData.redirects.map((row) => (
                    <tr className="border-t border-white/[0.06] text-zinc-300" key={row.id}>
                      <td className="px-3 py-2 font-mono text-xs">{row.source_path}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.target_path}</td>
                      <td className="px-3 py-2 text-xs">{row.entity_type ?? "—"}</td>
                      <td className="px-3 py-2">{row.is_active ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {urlData.slugHistory.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-100">Slug history gần đây</h2>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2">Old path</th>
                      <th className="px-3 py-2">New path</th>
                      <th className="px-3 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urlData.slugHistory.slice(0, 30).map((row) => (
                      <tr className="border-t border-white/[0.06] text-zinc-300" key={row.id}>
                        <td className="px-3 py-2 text-xs">{row.entity_type}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.old_path ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.new_path ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {new Date(row.changed_at).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
