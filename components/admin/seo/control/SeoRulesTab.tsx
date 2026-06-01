"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import {
  formatSeoDate,
  SeoCanonicalBadge,
  SeoFollowBadge,
  SeoIndexBadge
} from "@/components/admin/seo/SeoBadges";
import { bulkUpdateSeoRulesAction } from "@/lib/admin/seo-control-data";
import { isSensitiveSeoRoute } from "@/lib/seo/content-hub-seo-data";
import type { AdminSeoCapabilities } from "@/types/admin-seo";
import { SEO_PAGE_TYPES } from "@/types/admin-seo";
import type { SeoRule } from "@/types/platform-content";

type Props = {
  rules: SeoRule[];
  capabilities: AdminSeoCapabilities;
  pending?: boolean;
  onRefresh: () => void;
  onToast: (message: string) => void;
};

type BulkAction =
  | "index"
  | "noindex"
  | "follow"
  | "nofollow"
  | "sitemap_include"
  | "sitemap_exclude"
  | "activate"
  | "deactivate";

const PAGE_SIZE = 25;

export function SeoRulesTab({ rules, capabilities, onRefresh, onToast }: Props) {
  const [search, setSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState<"all" | "index" | "noindex">("all");
  const [sitemapFilter, setSitemapFilter] = useState<"all" | "yes" | "no">("all");
  const [canonicalFilter, setCanonicalFilter] = useState("all");
  const [pageType, setPageType] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [pending, startTransition] = useTransition();

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
    if (sitemapFilter === "yes") items = items.filter((rule) => rule.include_sitemap);
    if (sitemapFilter === "no") items = items.filter((rule) => !rule.include_sitemap);
    if (canonicalFilter !== "all") {
      items = items.filter((rule) => rule.canonical_mode === canonicalFilter);
    }
    if (pageType !== "all") items = items.filter((rule) => rule.page_type === pageType);
    return items;
  }, [rules, search, indexFilter, sitemapFilter, canonicalFilter, pageType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allPageSelected = pageItems.length > 0 && pageItems.every((rule) => selected.has(rule.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const rule of pageItems) next.delete(rule.id);
      } else {
        for (const rule of pageItems) next.add(rule.id);
      }
      return next;
    });
  }

  function runBulk(action: BulkAction, confirmDangerous = false) {
    const ids = [...selected];
    if (ids.length === 0) return;

    const patch: Parameters<typeof bulkUpdateSeoRulesAction>[0]["patch"] = {};
    if (action === "index") patch.indexable = true;
    if (action === "noindex") patch.indexable = false;
    if (action === "follow") patch.follow_links = true;
    if (action === "nofollow") patch.follow_links = false;
    if (action === "sitemap_include") patch.include_sitemap = true;
    if (action === "sitemap_exclude") patch.include_sitemap = false;
    if (action === "activate") patch.is_active = true;
    if (action === "deactivate") patch.is_active = false;

    startTransition(async () => {
      const result = await bulkUpdateSeoRulesAction({ ids, patch, confirmDangerous });
      onToast(result.message ?? (result.ok ? "Đã cập nhật." : "Lỗi."));
      if (result.ok) {
        setSelected(new Set());
        setConfirmAction(null);
        onRefresh();
      }
    });
  }

  function handleBulk(action: BulkAction) {
    if (action === "index") {
      const dangerous = [...selected].some((id) => {
        const rule = rules.find((item) => item.id === id);
        return rule && isSensitiveSeoRoute(rule.route_pattern);
      });
      if (dangerous) {
        setConfirmAction(action);
        return;
      }
    }
    runBulk(action);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 lg:grid-cols-6">
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs text-zinc-500">Tìm route</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="/truyen, /admin, story..."
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
            <option value="index">Được index</option>
            <option value="noindex">Không index</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Sitemap</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setSitemapFilter(event.target.value as typeof sitemapFilter);
              setPage(1);
            }}
            value={sitemapFilter}
          >
            <option value="all">Tất cả</option>
            <option value="yes">Đưa vào sitemap</option>
            <option value="no">Loại khỏi sitemap</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Canonical</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setCanonicalFilter(event.target.value);
              setPage(1);
            }}
            value={canonicalFilter}
          >
            <option value="all">Tất cả</option>
            <option value="self">self</option>
            <option value="custom">custom</option>
            <option value="parent">parent</option>
            <option value="none">none</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-zinc-500">Loại trang</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              setPageType(event.target.value);
              setPage(1);
            }}
            value={pageType}
          >
            <option value="all">Tất cả</option>
            {SEO_PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected.size > 0 && capabilities.canUpdateRules ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/30 bg-zinc-950/95 px-4 py-3 backdrop-blur">
          <span className="text-sm text-cyan-100">Đã chọn {selected.size}</span>
          {(
            [
              ["index", "Được index"],
              ["noindex", "Không index"],
              ["follow", "Theo liên kết"],
              ["nofollow", "Không theo liên kết"],
              ["sitemap_include", "Đưa vào sitemap"],
              ["sitemap_exclude", "Loại khỏi sitemap"],
              ["activate", "Kích hoạt"],
              ["deactivate", "Tắt"]
            ] as const
          ).map(([action, label]) => (
            <button
              className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              disabled={pending}
              key={action}
              onClick={() => handleBulk(action)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-zinc-500">
        {filtered.length} quy tắc · trang {page}/{totalPages}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[1100px] w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">
                <input checked={allPageSelected} onChange={toggleSelectPage} type="checkbox" />
              </th>
              <th className="px-3 py-3">Pattern</th>
              <th className="px-3 py-3">Loại trang</th>
              <th className="px-3 py-3">Index</th>
              <th className="px-3 py-3">Follow</th>
              <th className="px-3 py-3">Sitemap</th>
              <th className="px-3 py-3">Canonical</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Cập nhật</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {pageItems.map((rule) => (
              <tr className={rule.is_active === false ? "opacity-50" : undefined} key={rule.id}>
                <td className="px-3 py-3">
                  <input
                    checked={selected.has(rule.id)}
                    onChange={() => toggleSelect(rule.id)}
                    type="checkbox"
                  />
                </td>
                <td className="px-3 py-3 font-mono text-xs text-cyan-100">{rule.route_pattern}</td>
                <td className="px-3 py-3 text-xs text-violet-200">{rule.page_type}</td>
                <td className="px-3 py-3">
                  <SeoIndexBadge indexable={rule.indexable} />
                </td>
                <td className="px-3 py-3">
                  <SeoFollowBadge follow={rule.follow_links} />
                </td>
                <td className="px-3 py-3 text-xs">
                  {rule.include_sitemap ? (
                    <span className="text-emerald-300">Có</span>
                  ) : (
                    <span className="text-zinc-500">Không</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <SeoCanonicalBadge mode={rule.canonical_mode} />
                </td>
                <td className="px-3 py-3 text-xs">
                  {rule.is_active === false ? (
                    <span className="text-zinc-500">Tắt</span>
                  ) : (
                    <span className="text-emerald-300">Active</span>
                  )}
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
          Không có quy tắc phù hợp bộ lọc.
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

      <ConfirmActionModal
        confirmLabel="Vẫn index"
        description="Bạn đang bật index cho route private (admin/studio/wallet/messages...). Trang có thể lộ trên Google và gây rủi ro bảo mật."
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runBulk("index", true)}
        open={confirmAction === "index"}
        pending={pending}
        title="Cảnh báo nguy hiểm"
        variant="danger"
      />
    </div>
  );
}
