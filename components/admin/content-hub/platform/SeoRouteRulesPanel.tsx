"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatSeoDate,
  SeoCanonicalBadge,
  SeoFollowBadge,
  SeoIndexBadge
} from "@/components/admin/seo/SeoBadges";
import { SEO_PAGE_GROUPS } from "@/lib/seo/content-hub-seo-data";
import type { AdminSeoCapabilities } from "@/types/admin-seo";
import type { SeoRule } from "@/types/platform-content";

type Props = {
  rules: SeoRule[];
  capabilities: AdminSeoCapabilities;
};

const PAGE_SIZE = 25;

export function SeoRouteRulesPanel({ rules, capabilities }: Props) {
  const [search, setSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState<"all" | "index" | "noindex">("all");
  const [pageGroup, setPageGroup] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let items = rules;
    const term = search.trim().toLowerCase();
    if (term) {
      items = items.filter(
        (rule) =>
          rule.route_pattern.toLowerCase().includes(term) ||
          rule.page_type.toLowerCase().includes(term)
      );
    }
    if (indexFilter === "index") items = items.filter((rule) => rule.indexable);
    if (indexFilter === "noindex") items = items.filter((rule) => !rule.indexable);
    if (pageGroup !== "all") {
      items = items.filter((rule) => rule.page_type === pageGroup);
    }
    return items;
  }, [rules, search, indexFilter, pageGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 lg:grid-cols-4">
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs text-zinc-500">Tìm route</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="/truyen, /admin, story_catalog..."
            value={search}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Index</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setIndexFilter(event.target.value as typeof indexFilter);
              setPage(1);
            }}
            value={indexFilter}
          >
            <option value="all">Tất cả</option>
            <option value="index">Index</option>
            <option value="noindex">Noindex</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Nhóm trang</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setPageGroup(event.target.value);
              setPage(1);
            }}
            value={pageGroup}
          >
            <option value="all">Tất cả nhóm</option>
            {SEO_PAGE_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-zinc-500">
        {filtered.length} rules · trang {page}/{totalPages}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[960px] w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Pattern</th>
              <th className="px-3 py-3">Nhóm trang</th>
              <th className="px-3 py-3">Index</th>
              <th className="px-3 py-3">Follow</th>
              <th className="px-3 py-3">Canonical</th>
              <th className="px-3 py-3">Title template</th>
              <th className="px-3 py-3">Cập nhật</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {pageItems.map((rule) => (
              <tr key={rule.id}>
                <td className="px-3 py-3 font-mono text-xs text-cyan-100">{rule.route_pattern}</td>
                <td className="px-3 py-3 text-xs text-violet-200">{rule.page_type}</td>
                <td className="px-3 py-3">
                  <SeoIndexBadge indexable={rule.indexable} />
                </td>
                <td className="px-3 py-3">
                  <SeoFollowBadge follow={rule.follow_links} />
                </td>
                <td className="px-3 py-3">
                  <SeoCanonicalBadge mode={rule.canonical_mode} />
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 text-xs text-zinc-500">
                  {rule.title_template ?? "—"}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-500">{formatSeoDate(rule.updated_at)}</td>
                <td className="px-3 py-3">
                  {capabilities.canUpdateRules ? (
                    <Link
                      className="font-semibold text-cyan-300 hover:text-cyan-200"
                      href={`/admin/seo/rules/${rule.id}`}
                    >
                      Sửa
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-zinc-500">
          Không có rule phù hợp bộ lọc.
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
