"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PolicyStatusBadge } from "@/components/admin/policies/PolicyStatusBadge";
import {
  createSitePageDraftFromRegistryAction,
  syncMissingSitePagesAction
} from "@/lib/admin/policy-actions";
import { SITE_PAGE_GROUP_LABELS } from "@/lib/site-pages/registry";
import type { SitePageRegistryEntry } from "@/lib/site-pages/registry";
import type { AdminPolicyCapabilities, PolicyPage } from "@/types/policy-pages";

export type SitePageRegistryRow = {
  entry: SitePageRegistryEntry;
  page: PolicyPage | null;
};

type Props = {
  rows: SitePageRegistryRow[];
  capabilities: AdminPolicyCapabilities;
  onToast: (message: string) => void;
};

export function SitePagesRegistrySection({ rows, capabilities, onToast }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCreateDraft(publicPath: string) {
    startTransition(async () => {
      const result = await createSitePageDraftFromRegistryAction(publicPath);
      if (result.error) {
        onToast(result.error);
        return;
      }
      if (result.item) {
        onToast(
          "alreadyExists" in result && result.alreadyExists
            ? "Trang đã có trong CMS — mở bản chỉnh sửa."
            : "Đã tạo bản nháp."
        );
        router.push(`/admin/pages/${result.item.id}/edit`);
      }
    });
  }

  function handleSyncAll() {
    if (!window.confirm("Tạo bản nháp cho mọi trang hệ thống chưa có trong CMS?")) {
      return;
    }
    startTransition(async () => {
      const result = await syncMissingSitePagesAction();
      if (result.error) {
        onToast(result.error);
        return;
      }
      onToast(`Đã tạo ${result.created} trang, bỏ qua ${result.skipped} trang đã có.`);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Trang hệ thống</h2>
          <p className="text-sm text-zinc-400">
            About, liên hệ và các trang pháp lý. Tạo bản nháp rồi Publish để thay placeholder public.
          </p>
        </div>
        {capabilities.canCreate ? (
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
            disabled={pending}
            onClick={handleSyncAll}
            type="button"
          >
            Đồng bộ trang thiếu
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Nhóm</th>
              <th className="px-4 py-3">URL public</th>
              <th className="px-4 py-3">CMS</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry, page }) => (
              <tr className="border-t border-white/5" key={entry.key}>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{entry.title}</p>
                  <p className="text-xs text-zinc-500">{entry.description}</p>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {SITE_PAGE_GROUP_LABELS[entry.group]}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs text-cyan-200">{entry.publicPath}</code>
                </td>
                <td className="px-4 py-3">
                  {page ? <PolicyStatusBadge status={page.status} /> : (
                    <span className="text-xs text-zinc-500">Chưa có</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {page && capabilities.canEdit ? (
                      <Link
                        className="text-cyan-300 hover:text-cyan-200"
                        href={`/admin/pages/${page.id}/edit`}
                      >
                        Sửa
                      </Link>
                    ) : null}
                    {!page && capabilities.canCreate ? (
                      <button
                        className="text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
                        disabled={pending}
                        onClick={() => handleCreateDraft(entry.publicPath)}
                        type="button"
                      >
                        Tạo nháp
                      </button>
                    ) : null}
                    {page?.status === "published" ? (
                      <Link
                        className="text-zinc-300 hover:text-white"
                        href={page.canonical_path ?? entry.publicPath}
                        target="_blank"
                      >
                        Xem
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
