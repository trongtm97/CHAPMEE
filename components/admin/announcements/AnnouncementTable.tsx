"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AnnouncementEmptyState } from "@/components/admin/announcements/AnnouncementEmptyState";
import {
  AnnouncementAudienceBadge,
  AnnouncementPriorityBadge,
  AnnouncementSeoBadge,
  AnnouncementStatusBadge,
  AnnouncementTypeBadge,
  AnnouncementVisibilityBadge,
  formatAnnouncementDate,
  getAnnouncementAccentClass
} from "@/components/admin/announcements/AnnouncementBadges";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { hasAnnouncementSeoIssues } from "@/lib/announcements/labels";
import {
  deleteAnnouncementAction,
  duplicateAnnouncementAction,
  toggleAnnouncementStatusAction
} from "@/lib/admin/announcement-actions";
import type { AdminAnnouncementCapabilities } from "@/types/admin-announcements";
import type { PlatformAnnouncement } from "@/types/platform-content";

type Props = {
  items: PlatformAnnouncement[];
  capabilities: AdminAnnouncementCapabilities;
  hasFilters: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClearFilters: () => void;
  onRefresh?: () => void;
  onToast?: (message: string) => void;
};

export function AnnouncementTable({
  items,
  capabilities,
  hasFilters,
  selectedIds,
  onSelectionChange,
  onClearFilters,
  onRefresh,
  onToast
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleOne(id: string) {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onSelectionChange([...selectedIds, id]);
  }

  function toggleAllPage() {
    if (allSelected) {
      const pageIds = new Set(items.map((item) => item.id));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
      return;
    }
    const merged = new Set([...selectedIds, ...items.map((item) => item.id)]);
    onSelectionChange([...merged]);
  }

  function handleToggle(item: PlatformAnnouncement, status: PlatformAnnouncement["status"]) {
    startTransition(async () => {
      const result = await toggleAnnouncementStatusAction({ id: item.id, status });
      onToast?.(result.message ?? (result.ok ? "Đã cập nhật." : "Lỗi."));
      if (result.ok) onRefresh?.();
    });
  }

  function handleDuplicate(item: PlatformAnnouncement) {
    startTransition(async () => {
      const result = await duplicateAnnouncementAction(item.id);
      onToast?.(result.message ?? "");
      if (result.ok) onRefresh?.();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAnnouncementAction(id);
      onToast?.(result.message ?? "");
      if (result.ok) {
        onSelectionChange(selectedIds.filter((value) => value !== id));
        onRefresh?.();
      }
      setConfirmDeleteId(null);
    });
  }

  if (items.length === 0) {
    return (
      <AnnouncementEmptyState
        canCreate={capabilities.canCreate}
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  aria-label="Chọn tất cả trang"
                  checked={allSelected}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-950"
                  onChange={toggleAllPage}
                  type="checkbox"
                />
              </th>
              <th className="px-3 py-3">Tiêu đề</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Loại</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Audience</th>
              <th className="px-3 py-3">Hiển thị</th>
              <th className="px-3 py-3">Thời gian</th>
              <th className="px-3 py-3">SEO</th>
              <th className="px-3 py-3">Ưu tiên</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {items.map((item) => (
              <tr className={getAnnouncementAccentClass(item)} key={item.id}>
                <td className="px-3 py-3">
                  <input
                    aria-label={`Chọn ${item.title}`}
                    checked={selectedSet.has(item.id)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-950"
                    onChange={() => toggleOne(item.id)}
                    type="checkbox"
                  />
                </td>
                <td className="max-w-[200px] px-3 py-3">
                  <p className="truncate font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    Cập nhật {formatAnnouncementDate(item.updated_at)}
                  </p>
                </td>
                <td className="max-w-[140px] truncate px-3 py-3 font-mono text-xs text-zinc-400">
                  {item.slug}
                </td>
                <td className="px-3 py-3">
                  <AnnouncementTypeBadge type={item.announcement_type} />
                </td>
                <td className="px-3 py-3">
                  <AnnouncementStatusBadge status={item.status} />
                </td>
                <td className="px-3 py-3">
                  <AnnouncementAudienceBadge audience={item.audience_type} />
                </td>
                <td className="px-3 py-3">
                  <AnnouncementVisibilityBadge visibility={item.visibility} />
                </td>
                <td className="px-3 py-3 text-xs text-zinc-400">
                  <div>Đăng: {formatAnnouncementDate(item.published_at)}</div>
                  {item.scheduled_at ? (
                    <div className="text-sky-300">Lịch: {formatAnnouncementDate(item.scheduled_at)}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <AnnouncementSeoBadge
                    hasIssues={hasAnnouncementSeoIssues(item)}
                    indexable={item.indexable}
                  />
                </td>
                <td className="px-3 py-3">
                  <AnnouncementPriorityBadge priority={item.priority} />
                </td>
                <td className="px-3 py-3">
                  <RowActions
                    capabilities={capabilities}
                    item={item}
                    onDelete={() => setConfirmDeleteId(item.id)}
                    onDuplicate={() => handleDuplicate(item)}
                    onToggle={handleToggle}
                    pending={pending}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <article
            className={`rounded-2xl border border-white/10 bg-zinc-950/60 p-4 ${getAnnouncementAccentClass(item)}`}
            key={item.id}
          >
            <div className="flex items-start gap-3">
              <input
                aria-label={`Chọn ${item.title}`}
                checked={selectedSet.has(item.id)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-950"
                onChange={() => toggleOne(item.id)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <button
                    aria-label="Menu"
                    className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/5"
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    type="button"
                  >
                    ···
                  </button>
                </div>
                <p className="truncate font-mono text-xs text-zinc-500">{item.slug}</p>
                <div className="flex flex-wrap gap-2">
                  <AnnouncementTypeBadge type={item.announcement_type} />
                  <AnnouncementStatusBadge status={item.status} />
                  <AnnouncementSeoBadge
                    hasIssues={hasAnnouncementSeoIssues(item)}
                    indexable={item.indexable}
                  />
                </div>
                <div className="text-xs text-zinc-500">
                  <p>Đăng: {formatAnnouncementDate(item.published_at)}</p>
                  {item.scheduled_at ? (
                    <p>Lịch: {formatAnnouncementDate(item.scheduled_at)}</p>
                  ) : null}
                </div>
                {openMenuId === item.id ? (
                  <RowActions
                    capabilities={capabilities}
                    item={item}
                    onDelete={() => setConfirmDeleteId(item.id)}
                    onDuplicate={() => handleDuplicate(item)}
                    onToggle={handleToggle}
                    pending={pending}
                    stacked
                  />
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ConfirmActionModal
        confirmLabel="Xóa"
        description="Xóa vĩnh viễn thông báo này? Không thể hoàn tác."
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) handleDelete(confirmDeleteId);
        }}
        open={Boolean(confirmDeleteId)}
        pending={pending}
        title="Xóa thông báo"
        variant="danger"
      />
    </>
  );
}

function RowActions({
  item,
  capabilities,
  pending,
  stacked,
  onToggle,
  onDuplicate,
  onDelete
}: {
  item: PlatformAnnouncement;
  capabilities: AdminAnnouncementCapabilities;
  pending: boolean;
  stacked?: boolean;
  onToggle: (item: PlatformAnnouncement, status: PlatformAnnouncement["status"]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const canViewPublic = item.visibility === "public" && item.status === "published";
  const campaignHref = `/admin/notifications/new?announcementId=${item.id}`;

  return (
    <div className={`flex flex-wrap gap-2 ${stacked ? "pt-2" : ""}`}>
      {canViewPublic ? (
        <Link
          className="rounded-lg border border-cyan-400/20 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/10"
          href={`/thong-bao/${item.slug}`}
          target="_blank"
        >
          Xem
        </Link>
      ) : null}
      {capabilities.canUpdate ? (
        <Link
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/5"
          href={`/admin/announcements/${item.id}`}
        >
          Sửa
        </Link>
      ) : null}
      {capabilities.canCreate ? (
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={onDuplicate}
          type="button"
        >
          Nhân bản
        </button>
      ) : null}
      {capabilities.canCreate ? (
        <Link
          className="rounded-lg border border-violet-400/20 px-3 py-1.5 text-xs font-medium text-violet-100 transition hover:bg-violet-400/10"
          href={campaignHref}
          title="Tạo notification campaign từ thông báo này (không tự gửi)"
        >
          Campaign
        </Link>
      ) : null}
      {capabilities.canUpdate && item.status !== "published" ? (
        <button
          className="rounded-lg border border-emerald-400/20 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => onToggle(item, "published")}
          type="button"
        >
          Đăng
        </button>
      ) : null}
      {capabilities.canUpdate && item.status === "published" ? (
        <button
          className="rounded-lg border border-amber-400/20 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => onToggle(item, "hidden")}
          type="button"
        >
          Ẩn
        </button>
      ) : null}
      {capabilities.canUpdate && item.status !== "archived" ? (
        <button
          className="rounded-lg border border-zinc-500/30 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => onToggle(item, "archived")}
          type="button"
        >
          Archive
        </button>
      ) : null}
      {capabilities.canUpdate ? (
        <button
          className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/10 disabled:opacity-50"
          disabled={pending}
          onClick={onDelete}
          type="button"
        >
          Xóa
        </button>
      ) : null}
    </div>
  );
}
