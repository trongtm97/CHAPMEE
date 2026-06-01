"use client";

import Link from "next/link";
import {
  getFeedbackStatusLabel,
  getFeedbackTypeLabel
} from "@/lib/feedback/constants";
import type { AdminFeedbackListItem } from "@/types/contact-settings";

type RecentFeedbackPanelProps = {
  items: AdminFeedbackListItem[];
  canViewAll?: boolean;
};

const STATUS_CLASS: Record<string, string> = {
  new: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  reviewing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  replied: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  rejected: "border-red-400/30 bg-red-400/10 text-red-100"
};

export function RecentFeedbackPanel({
  items,
  canViewAll = true
}: RecentFeedbackPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">Góp ý gần đây</h3>
          <p className="text-xs text-zinc-500">5–10 phản hồi mới nhất từ người dùng.</p>
        </div>
        {canViewAll ? (
          <Link
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            href="/admin/feedback"
          >
            Xem tất cả feedback →
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Chưa có góp ý nào.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const preview = item.title?.trim() || item.message.slice(0, 80);
            const userLabel =
              item.user_display_name ||
              item.user_username ||
              (item.user_id ? "User" : "Khách");

            return (
              <li
                className="rounded-xl border border-white/10 bg-zinc-950/60 p-3"
                key={item.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-cyan-200">
                      {getFeedbackTypeLabel(item.category)}
                    </p>
                    <p className="mt-1 truncate text-sm text-white">{preview}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {userLabel} ·{" "}
                      {new Date(item.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      STATUS_CLASS[item.status] ?? STATUS_CLASS.new
                    }`}
                  >
                    {getFeedbackStatusLabel(item.status)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
