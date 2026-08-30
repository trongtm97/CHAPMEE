"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ErrorState } from "@/components/ui";
import { PolicyPagination } from "@/components/admin/policies/PolicyPagination";
import { PolicyStatusBadge } from "@/components/admin/policies/PolicyStatusBadge";
import {
  SitePagesRegistrySection,
  type SitePageRegistryRow
} from "@/components/admin/policies/SitePagesRegistrySection";
import { SITE_PAGE_GROUP_LABELS } from "@/lib/site-pages/registry";
import {
  archivePolicyPageAction,
  getPolicyStatsForAdminAction,
  listPoliciesForAdminAction,
  publishPolicyPageAction
} from "@/lib/admin/policy-actions";
import {
  buildPolicyListQuery,
  type PolicyListFilters
} from "@/lib/policies/parse-policy-filters";
import {
  POLICY_TYPE_LABELS,
  type AdminPolicyCapabilities,
  type PolicyPage,
  type PolicyPageStats
} from "@/types/policy-pages";

type Props = {
  initialFilters: PolicyListFilters;
  initialItems: PolicyPage[];
  initialRegistryRows: SitePageRegistryRow[];
  initialTotal: number;
  initialStats: PolicyPageStats;
  capabilities: AdminPolicyCapabilities;
  loadError?: string | null;
};

export function AdminPoliciesPage({
  initialFilters,
  initialItems,
  initialRegistryRows,
  initialTotal,
  initialStats,
  capabilities,
  loadError
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [listError, setListError] = useState(loadError);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const refreshList = useCallback(
    (next: PolicyListFilters, push = true) => {
      startTransition(async () => {
        setListError(null);
        const [listResult, statsResult] = await Promise.all([
          listPoliciesForAdminAction(next),
          getPolicyStatsForAdminAction()
        ]);
        if (listResult.error) {
          setListError(listResult.error);
          return;
        }
        setItems(listResult.items);
        setTotal(listResult.total);
        setFilters(next);
        if (statsResult.stats) setStats(statsResult.stats);
        if (push) router.push(`/admin/pages${buildPolicyListQuery(next)}`);
      });
    },
    [router]
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  function handlePublish(id: string) {
    startTransition(async () => {
      const result = await publishPolicyPageAction(id);
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Đã xuất bản trang.");
      refreshList(filters, false);
    });
  }

  function handleArchive(id: string) {
    if (!window.confirm("Lưu trữ trang này? Bản public sẽ không còn hiển thị.")) {
      return;
    }
    startTransition(async () => {
      const result = await archivePolicyPageAction(id);
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Đã lưu trữ trang.");
      refreshList(filters, false);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản lý trang</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Chỉnh nội dung About, Liên hệ, trang pháp lý và các trang /chinh-sach.
          </p>
        </div>
        {capabilities.canCreate ? (
          <Link
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-zinc-950"
            href="/admin/pages/new"
          >
            Tạo trang tùy chỉnh
          </Link>
        ) : null}
      </header>

      {initialFilters.siteGroup !== "legacy" ? (
        <SitePagesRegistrySection
          capabilities={capabilities}
          onToast={showToast}
          rows={initialRegistryRows}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Draft", value: stats.draft },
          { label: "Archived", value: stats.archived }
        ].map((card) => (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4" key={card.label}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          refreshList({ ...filters, search: searchInput, page: 1 });
        }}
      >
        <input
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm theo tiêu đề, slug, URL..."
          value={searchInput}
        />
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) =>
            refreshList({
              ...filters,
              status: event.target.value as PolicyListFilters["status"],
              page: 1
            })
          }
          value={filters.status}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) =>
            refreshList({
              ...filters,
              siteGroup: event.target.value as PolicyListFilters["siteGroup"],
              page: 1
            })
          }
          value={filters.siteGroup}
        >
          <option value="all">Tất cả nhóm trang</option>
          {Object.entries(SITE_PAGE_GROUP_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) =>
            refreshList({
              ...filters,
              policyType: event.target.value as PolicyListFilters["policyType"],
              page: 1
            })
          }
          value={filters.policyType}
        >
          <option value="all">Tất cả loại policy</option>
          {Object.entries(POLICY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Tìm
        </button>
      </form>

      {listError ? <ErrorState message={listError} title="Không tải được danh sách" /> : null}
      {toast ? (
        <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          {toast}
        </p>
      ) : null}

      <h2 className="text-lg font-bold text-white">Tất cả bản ghi CMS</h2>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">URL public</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Effective</th>
              <th className="px-4 py-3">SEO</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t border-white/5" key={item.id}>
                <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                <td className="px-4 py-3">
                  <code className="text-xs text-cyan-200">
                    {item.canonical_path ?? `/chinh-sach/${item.slug}`}
                  </code>
                </td>
                <td className="px-4 py-3 text-zinc-300">{POLICY_TYPE_LABELS[item.policy_type]}</td>
                <td className="px-4 py-3">
                  <PolicyStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-zinc-300">v{item.version}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {item.effective_date
                    ? new Date(item.effective_date).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {item.seo_indexable ? "Index" : "Noindex"}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {new Date(item.updated_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {capabilities.canEdit ? (
                      <Link
                        className="text-cyan-300 hover:text-cyan-200"
                        href={`/admin/pages/${item.id}/edit`}
                      >
                        Edit
                      </Link>
                    ) : null}
                    {item.status === "published" ? (
                      <Link
                        className="text-zinc-300 hover:text-white"
                        href={item.canonical_path ?? `/chinh-sach/${item.slug}`}
                        target="_blank"
                      >
                        View
                      </Link>
                    ) : null}
                    {capabilities.canPublish && item.status !== "published" ? (
                      <button
                        className="text-emerald-300 hover:text-emerald-200"
                        disabled={pending}
                        onClick={() => handlePublish(item.id)}
                        type="button"
                      >
                        Publish
                      </button>
                    ) : null}
                    {capabilities.canPublish && item.status === "published" ? (
                      <button
                        className="text-amber-300 hover:text-amber-200"
                        disabled={pending}
                        onClick={() => handleArchive(item.id)}
                        type="button"
                      >
                        Archive
                      </button>
                    ) : null}
                    {capabilities.canViewVersions ? (
                      <Link
                        className="text-zinc-400 hover:text-zinc-200"
                        href={`/admin/pages/${item.id}/edit?tab=versions`}
                      >
                        Versions
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PolicyPagination
        filters={filters}
        onPageChange={(page) => refreshList({ ...filters, page })}
        pending={pending}
        totalPages={totalPages}
      />
    </div>
  );
}
