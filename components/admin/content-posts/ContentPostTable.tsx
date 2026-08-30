"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ContentPostEmptyState } from "@/components/admin/content-posts/ContentPostEmptyState";
import {
  ContentPostIndexBadge,
  ContentPostSeoScoreBadge,
  ContentPostStatusBadge,
  ContentPostTypeBadge,
  formatContentPostDate
} from "@/components/admin/content-posts/ContentPostStatusBadge";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { contentPostHasSeoIssue, getContentPostSeoScoreForItem } from "@/lib/content-posts/post-seo";
import { getContentPostUrl } from "@/lib/urls/paths";
import {
  duplicateContentPostAction,
  softDeleteContentPostAction,
  toggleContentPostStatusAction
} from "@/lib/admin/content-post-actions";
import type { AdminContentPostCapabilities } from "@/types/admin-content-posts";
import type { AdminContentPost } from "@/types/platform-content";

type Props = {
  items: AdminContentPost[];
  capabilities: AdminContentPostCapabilities;
  hasFilters: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClearFilters: () => void;
  onRefresh?: () => void;
  onToast?: (message: string) => void;
};

type ActionTone = "default" | "success" | "warning" | "muted" | "danger";

type ActionMenuItem = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  tone?: ActionTone;
};

export function ContentPostTable({
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = items.length > 0 && items.every((item) => selectedSet.has(item.id));

  function toggleOne(id: string) {
    if (selectedSet.has(id)) onSelectionChange(selectedIds.filter((v) => v !== id));
    else onSelectionChange([...selectedIds, id]);
  }

  function toggleAllPage() {
    if (allSelected) {
      const pageIds = new Set(items.map((i) => i.id));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...items.map((i) => i.id)])]);
    }
  }

  function handleToggle(item: AdminContentPost, status: AdminContentPost["status"]) {
    startTransition(async () => {
      const result = await toggleContentPostStatusAction({ id: item.id, status });
      onToast?.(result.message ?? "");
      if (result.ok) onRefresh?.();
    });
  }

  function handleDuplicate(item: AdminContentPost) {
    startTransition(async () => {
      const result = await duplicateContentPostAction(item.id);
      onToast?.(result.message ?? "");
      if (result.ok) onRefresh?.();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await softDeleteContentPostAction(id);
      onToast?.(result.message ?? "");
      if (result.ok) {
        onSelectionChange(selectedIds.filter((v) => v !== id));
        onRefresh?.();
      }
      setDeleteId(null);
    });
  }

  if (items.length === 0) {
    return (
      <ContentPostEmptyState
        canCreate={capabilities.canCreate}
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  aria-label="Chọn tất cả"
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
              <th className="px-3 py-3">Index</th>
              <th className="px-3 py-3">SEO</th>
              <th className="px-3 py-3">Lượt xem</th>
              <th className="px-3 py-3">Cập nhật</th>
              <th className="px-3 py-3">Đăng</th>
              <th className="w-[1%] whitespace-nowrap px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-zinc-950/40 text-zinc-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <input
                    checked={selectedSet.has(item.id)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-950"
                    onChange={() => toggleOne(item.id)}
                    type="checkbox"
                  />
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 font-medium text-white">{item.title}</td>
                <td className="max-w-[120px] truncate px-3 py-3 font-mono text-xs text-zinc-400">
                  {item.slug}
                </td>
                <td className="px-3 py-3">
                  <ContentPostTypeBadge type={item.post_type} />
                </td>
                <td className="px-3 py-3">
                  <ContentPostStatusBadge status={item.status} />
                </td>
                <td className="px-3 py-3">
                  <ContentPostIndexBadge
                    hasIssue={contentPostHasSeoIssue(item)}
                    indexable={item.indexable}
                  />
                </td>
                <td className="px-3 py-3">
                  <ContentPostSeoScoreBadge score={getContentPostSeoScoreForItem(item)} />
                </td>
                <td className="px-3 py-3 text-xs tabular-nums text-zinc-300">
                  {(item.view_count ?? 0).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-400">{formatContentPostDate(item.updated_at)}</td>
                <td className="px-3 py-3 text-xs text-zinc-400">{formatContentPostDate(item.published_at)}</td>
                <td className="px-3 py-3">
                  <RowActions
                    capabilities={capabilities}
                    item={item}
                    menuOpen={menuId === item.id}
                    onDelete={() => setDeleteId(item.id)}
                    onDuplicate={() => handleDuplicate(item)}
                    onMenuToggle={() => setMenuId(menuId === item.id ? null : item.id)}
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
          <article className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4" key={item.id}>
            <div className="flex gap-3">
              <input
                checked={selectedSet.has(item.id)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-950"
                onChange={() => toggleOne(item.id)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <button
                    className="text-zinc-400"
                    onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                    type="button"
                  >
                    ···
                  </button>
                </div>
                <p className="truncate font-mono text-xs text-zinc-500">{item.slug}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ContentPostTypeBadge type={item.post_type} />
                  <ContentPostStatusBadge status={item.status} />
                  <ContentPostSeoScoreBadge score={getContentPostSeoScoreForItem(item)} />
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-300">
                    {(item.view_count ?? 0).toLocaleString("vi-VN")} lượt xem
                  </span>
                </div>
                {menuId === item.id ? (
                  <div className="mt-3">
                    <RowActions
                      capabilities={capabilities}
                      item={item}
                      menuOpen
                      onDelete={() => setDeleteId(item.id)}
                      onDuplicate={() => handleDuplicate(item)}
                      onMenuToggle={() => setMenuId(null)}
                      onToggle={handleToggle}
                      pending={pending}
                      stacked
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ConfirmActionModal
        confirmLabel="Xóa mềm"
        description="Xóa mềm bài viết này?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
        open={Boolean(deleteId)}
        pending={pending}
        title="Xóa mềm bài viết"
        variant="danger"
      />
    </>
  );
}

function buildMenuItems(
  item: AdminContentPost,
  capabilities: AdminContentPostCapabilities,
  liveUrl: string,
  canPreview: boolean,
  handlers: {
    onDuplicate: () => void;
    onToggle: (item: AdminContentPost, status: AdminContentPost["status"]) => void;
    onDelete: () => void;
    onMenuToggle?: () => void;
  }
): ActionMenuItem[] {
  const close = () => handlers.onMenuToggle?.();
  const items: ActionMenuItem[] = [];

  if (canPreview) {
    items.push({
      key: "preview",
      label: "Xem bài viết ↗",
      href: liveUrl,
      external: true
    });
  }
  if (capabilities.canCreate) {
    items.push({
      key: "duplicate",
      label: "Nhân bản",
      onClick: () => {
        handlers.onDuplicate();
        close();
      }
    });
  }
  if (capabilities.canUpdate && item.status !== "published") {
    items.push({
      key: "publish",
      label: "Đăng",
      tone: "success",
      onClick: () => {
        handlers.onToggle(item, "published");
        close();
      }
    });
  }
  if (capabilities.canUpdate && item.status === "published") {
    items.push({
      key: "hide",
      label: "Ẩn",
      tone: "warning",
      onClick: () => {
        handlers.onToggle(item, "hidden");
        close();
      }
    });
  }
  if (capabilities.canUpdate && item.status !== "archived") {
    items.push({
      key: "archive",
      label: "Archive",
      tone: "muted",
      onClick: () => {
        handlers.onToggle(item, "archived");
        close();
      }
    });
  }
  if (capabilities.canUpdate) {
    items.push({
      key: "delete",
      label: "Xóa mềm",
      tone: "danger",
      onClick: () => {
        handlers.onDelete();
        close();
      }
    });
  }

  return items;
}

function RowActions({
  item,
  capabilities,
  pending,
  stacked,
  menuOpen,
  onMenuToggle,
  onToggle,
  onDuplicate,
  onDelete
}: {
  item: AdminContentPost;
  capabilities: AdminContentPostCapabilities;
  pending: boolean;
  stacked?: boolean;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  onToggle: (item: AdminContentPost, status: AdminContentPost["status"]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const canPreview = item.status === "published";
  const liveUrl = item.public_code
    ? getContentPostUrl({ slug: item.slug, public_code: item.public_code })
    : `/bai-viet/${item.slug}`;

  useEffect(() => {
    if (!menuOpen || stacked) return;
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onMenuToggle?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, onMenuToggle, stacked]);

  const menuItems = buildMenuItems(item, capabilities, liveUrl, canPreview, {
    onDelete,
    onDuplicate,
    onMenuToggle,
    onToggle
  });

  if (stacked) {
    return (
      <div className="flex flex-col gap-1.5 pt-1">
        {capabilities.canUpdate ? (
          <Link
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
            href={`/admin/content-hub/${item.id}`}
          >
            Sửa
          </Link>
        ) : null}
        {menuItems.map((entry) =>
          entry.href ? (
            <a
              className="rounded-lg border border-cyan-400/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10"
              href={entry.href}
              key={entry.key}
              rel="noreferrer"
              target="_blank"
            >
              {entry.label}
            </a>
          ) : (
            <button
              className="rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
              disabled={pending}
              key={entry.key}
              onClick={entry.onClick}
              type="button"
            >
              {entry.label}
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1" ref={menuRef}>
      {capabilities.canUpdate ? (
        <Link
          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/5"
          href={`/admin/content-hub/${item.id}`}
        >
          Sửa
        </Link>
      ) : null}
      {menuItems.length > 0 ? (
        <>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Thêm thao tác"
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
            disabled={pending}
            onClick={onMenuToggle}
            type="button"
          >
            ···
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] rounded-xl border border-white/10 bg-zinc-950 py-1 shadow-xl"
              role="menu"
            >
              {menuItems.map((entry) => {
                const toneClass =
                  entry.tone === "success"
                    ? "text-emerald-100 hover:bg-emerald-400/10"
                    : entry.tone === "warning"
                      ? "text-amber-100 hover:bg-amber-400/10"
                      : entry.tone === "danger"
                        ? "text-red-200 hover:bg-red-400/10"
                        : entry.tone === "muted"
                          ? "text-zinc-300 hover:bg-white/5"
                          : "text-zinc-200 hover:bg-white/5";

                if (entry.href) {
                  return (
                    <a
                      className={`block px-3 py-2 text-xs ${toneClass}`}
                      href={entry.href}
                      key={entry.key}
                      rel="noreferrer"
                      role="menuitem"
                      target="_blank"
                    >
                      {entry.label}
                    </a>
                  );
                }

                return (
                  <button
                    className={`block w-full px-3 py-2 text-left text-xs disabled:opacity-50 ${toneClass}`}
                    disabled={pending}
                    key={entry.key}
                    onClick={entry.onClick}
                    role="menuitem"
                    type="button"
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
