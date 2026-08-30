"use client";

import { FeedbackPriorityBadge } from "@/components/admin/feedback/FeedbackPriorityBadge";
import { FeedbackStatusBadge } from "@/components/admin/feedback/FeedbackStatusBadge";
import { formatFeedbackCode, getFeedbackTypeLabel } from "@/lib/feedback/constants";
import type { FeedbackAdminCapabilities } from "@/types/admin-feedback";
import type { AdminFeedbackListItem } from "@/types/contact-settings";

type Props = {
  items: AdminFeedbackListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  capabilities: FeedbackAdminCapabilities;
};

function previewText(item: AdminFeedbackListItem) {
  const text = item.title?.trim() || item.message;
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

function userLabel(item: AdminFeedbackListItem) {
  return item.user_display_name || item.user_username || (item.user_id ? "User" : "Khách");
}

function entityLabel(item: AdminFeedbackListItem) {
  const pagePath =
    item.device_info && typeof item.device_info.page_path === "string"
      ? item.device_info.page_path
      : null;
  if (pagePath) return pagePath;
  if (item.related_entity_type && item.related_entity_id) {
    return `${item.related_entity_type}:${item.related_entity_id.slice(0, 8)}`;
  }
  if (item.related_url) return "URL";
  return "—";
}

export function FeedbackTable({ items, selectedId, onSelect }: Props) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-white/[0.03] text-left text-xs text-zinc-500">
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-900/95 px-3 py-2">Mã</th>
            <th className="px-3 py-2">Loại</th>
            <th className="px-3 py-2">Nội dung</th>
            <th className="px-3 py-2">Người gửi</th>
            <th className="px-3 py-2">Ưu tiên</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Ảnh</th>
            <th className="px-3 py-2">Liên quan</th>
            <th className="px-3 py-2">Xử lý</th>
            <th className="px-3 py-2">Gửi lúc</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={`border-t border-white/5 ${selectedId === item.id ? "bg-cyan-500/5" : "hover:bg-white/[0.02]"}`}
              key={item.id}
            >
              <td className="sticky left-0 z-10 bg-zinc-900/95 px-3 py-2 font-mono text-xs text-cyan-200">
                {formatFeedbackCode(item.code, item.id)}
              </td>
              <td className="px-3 py-2 text-zinc-400">{getFeedbackTypeLabel(item.category)}</td>
              <td className="max-w-[200px] truncate px-3 py-2 text-zinc-200">{previewText(item)}</td>
              <td className="px-3 py-2 text-zinc-400">{userLabel(item)}</td>
              <td className="px-3 py-2">
                <FeedbackPriorityBadge priority={item.priority} />
              </td>
              <td className="px-3 py-2">
                <FeedbackStatusBadge status={item.status} />
              </td>
              <td className="px-3 py-2 text-zinc-500">
                {(item as AdminFeedbackListItem & { attachment_count?: number }).attachment_count ||
                item.screenshot_url
                  ? "Có"
                  : "—"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">{entityLabel(item)}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {(item as AdminFeedbackListItem & { assigned_admin_label?: string }).assigned_admin_label ??
                  "—"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {new Date(item.created_at).toLocaleString("vi-VN")}
              </td>
              <td className="px-3 py-2">
                <button
                  className="text-xs text-cyan-300 hover:underline"
                  onClick={() => onSelect(item.id)}
                  type="button"
                >
                  Xem
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeedbackCardList({ items, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3 lg:hidden">
      {items.map((item) => (
        <button
          className={`w-full rounded-xl border p-4 text-left ${
            selectedId === item.id
              ? "border-cyan-400/40 bg-cyan-500/5"
              : "border-white/10 bg-white/[0.02]"
          }`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-xs text-cyan-200">
              {formatFeedbackCode(item.code, item.id)}
            </span>
            <FeedbackStatusBadge status={item.status} />
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-white">{previewText(item)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{getFeedbackTypeLabel(item.category)}</span>
            <FeedbackPriorityBadge priority={item.priority} />
            <span>{userLabel(item)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
