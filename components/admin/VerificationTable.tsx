"use client";

import { useState } from "react";
import { AvatarFallback, Button } from "@/components/ui";
import {
  VERIFICATION_SOURCE_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_TYPE_LABELS
} from "@/lib/verification/labels";
import type { VerificationAdminCapabilities } from "@/types/admin-verification";
import type { AdminVerificationListItem } from "@/types/verification";
import type { VerificationActionType } from "@/types/admin-verification";

function StatusBadge({ status }: { status: AdminVerificationListItem["status"] }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-200",
    approved: "bg-emerald-500/15 text-emerald-200",
    rejected: "bg-red-500/15 text-red-200",
    revoked: "bg-zinc-500/15 text-zinc-300",
    needs_more_info: "bg-orange-500/15 text-orange-200",
    expired: "bg-zinc-600/15 text-zinc-400"
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.pending}`}>
      {VERIFICATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function AccountCell({ item }: { item: AdminVerificationListItem }) {
  const name = item.displayName ?? item.username ?? item.userId;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AvatarFallback name={name} size="sm" src={item.avatarUrl} />
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{name}</p>
        <p className="truncate text-xs text-zinc-400">@{item.username ?? "—"}</p>
        {item.email ? <p className="truncate text-[11px] text-zinc-600">{item.email}</p> : null}
        {item.isAuthor ? (
          <span className="mt-0.5 inline-block rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-200">
            Tác giả
          </span>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  items: AdminVerificationListItem[];
  capabilities: VerificationAdminCapabilities;
  onView: (item: AdminVerificationListItem) => void;
  onAction: (item: AdminVerificationListItem, action: VerificationActionType) => void;
};

export function VerificationTable({ items, capabilities, onView, onAction }: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Tài khoản</th>
              <th className="px-4 py-3 font-medium">Loại xác thực</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Nguồn</th>
              <th className="px-4 py-3 font-medium">Lý do/nhãn công khai</th>
              <th className="px-4 py-3 font-medium">Người xử lý</th>
              <th className="px-4 py-3 font-medium">Ngày gửi</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={item.id}>
                <td className="px-4 py-3">
                  <AccountCell item={item} />
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {VERIFICATION_TYPE_LABELS[item.verificationType]}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {VERIFICATION_SOURCE_LABELS[item.source]}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-zinc-400">
                  {item.publicLabel || item.requestReason || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-400">{item.reviewedByName ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString("vi-VN")
                    : new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </td>
                <td className="relative px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button onClick={() => onView(item)} type="button" variant="ghost">
                      Xem
                    </Button>
                    <button
                      className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      type="button"
                    >
                      ⋯
                    </button>
                  </div>
                  {openMenuId === item.id ? (
                    <div className="absolute right-4 top-10 z-10 min-w-[160px] rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl">
                      {capabilities.canManage && item.status === "pending" ? (
                        <>
                          <MenuItem
                            label="Duyệt"
                            onClick={() => {
                              onAction(item, "approve");
                              setOpenMenuId(null);
                            }}
                          />
                          <MenuItem
                            label="Từ chối"
                            onClick={() => {
                              onAction(item, "reject");
                              setOpenMenuId(null);
                            }}
                            tone="danger"
                          />
                          <MenuItem
                            label="Yêu cầu bổ sung"
                            onClick={() => {
                              onAction(item, "needs_more_info");
                              setOpenMenuId(null);
                            }}
                          />
                        </>
                      ) : null}
                      {capabilities.canManage && item.status === "approved" ? (
                        <MenuItem
                          label="Thu hồi"
                          onClick={() => {
                            onAction(item, "revoke");
                            setOpenMenuId(null);
                          }}
                          tone="danger"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const name = item.displayName ?? item.username ?? item.userId;
          return (
            <article
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              key={item.id}
            >
              <AccountCell item={item} />
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={item.status} />
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                  {VERIFICATION_TYPE_LABELS[item.verificationType]}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {VERIFICATION_SOURCE_LABELS[item.source]} ·{" "}
                {item.submittedAt
                  ? new Date(item.submittedAt).toLocaleString("vi-VN")
                  : new Date(item.createdAt).toLocaleString("vi-VN")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => onView(item)} type="button" variant="ghost">
                  Xem
                </Button>
                {capabilities.canManage && item.status === "pending" ? (
                  <>
                    <Button
                      onClick={() => onAction(item, "approve")}
                      type="button"
                    >
                      Duyệt
                    </Button>
                    <Button
                      onClick={() => onAction(item, "reject")}
                      type="button"
                      variant="ghost"
                    >
                      Từ chối
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function MenuItem({
  label,
  onClick,
  tone = "default"
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      className={`block w-full px-3 py-2 text-left text-sm ${
        tone === "danger"
          ? "text-red-300 hover:bg-red-500/10"
          : "text-zinc-200 hover:bg-white/5"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function VerificationEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">
        {filtered ? "Không tìm thấy yêu cầu phù hợp" : "Không có yêu cầu xác thực"}
      </p>
      <p className="mt-2 text-sm text-zinc-400">
        {filtered
          ? "Thử đổi bộ lọc hoặc tìm bằng username/email khác."
          : "Khi người dùng hoặc tác giả gửi yêu cầu xác thực, yêu cầu sẽ xuất hiện tại đây."}
      </p>
    </div>
  );
}

export function VerificationErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">Không tải được dữ liệu xác thực</p>
      <p className="mt-2 text-sm text-zinc-400">
        Vui lòng thử lại. Nếu lỗi tiếp tục xảy ra, kiểm tra query account_verifications và
        profiles.
      </p>
      <Button className="mt-4" onClick={onRetry} type="button">
        Thử lại
      </Button>
    </div>
  );
}
