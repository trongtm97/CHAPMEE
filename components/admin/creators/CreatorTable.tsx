"use client";

import {
  formatMonetizationStatusLabel,
  formatStudioStatusLabel,
  monetizationStatusBadgeClass
} from "@/lib/admin/creator-labels";
import {
  formatCreatorContentLine,
  getCreatorActionStatusLabel,
  getCreatorNeedsActionLabels
} from "@/lib/admin/creator-row-helpers";
import { CreatorRowMenu } from "@/components/admin/creators/CreatorRowMenu";
import { Button } from "@/components/ui";
import type { AdminCreatorListRow } from "@/types/admin-creator";
import type { CreatorModalType } from "@/components/admin/creators/CreatorActionModals";

type Props = {
  creators: AdminCreatorListRow[];
  hasActiveFilters: boolean;
  onView: (row: AdminCreatorListRow) => void;
  onResetFilters: () => void;
  onOpenModalFromRow?: (row: AdminCreatorListRow, type: CreatorModalType) => void;
  onOpenTabFromRow?: (row: AdminCreatorListRow, tab: string) => void;
};

function formatVnd(n: number) {
  if (n <= 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(n);
}

function verificationLabel(row: AdminCreatorListRow) {
  if (row.hasBlueTick) return "Tick xanh";
  if (row.isVerified) return "Đã xác minh";
  return "Chưa xác minh";
}

function qualityLabel(row: AdminCreatorListRow) {
  if (row.violationCount > 0) return `${row.violationCount} strike`;
  if (row.hiddenStoryCount > 0) return `${row.hiddenStoryCount} truyện ẩn`;
  if (row.qualityWarningCount > 0) return `${row.qualityWarningCount} cảnh báo`;
  return "Bình thường";
}

export function CreatorTable({
  creators,
  hasActiveFilters,
  onView,
  onResetFilters,
  onOpenModalFromRow,
  onOpenTabFromRow
}: Props) {
  if (creators.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <h3 className="text-lg font-semibold text-white">
          {hasActiveFilters ? "Không tìm thấy tác giả phù hợp" : "Chưa có tác giả nào"}
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          {hasActiveFilters
            ? "Thử đổi bộ lọc, tìm theo username/email hoặc reset bộ lọc."
            : "Khi người dùng tạo Studio hoặc gửi yêu cầu kiếm tiền, họ sẽ xuất hiện tại đây."}
        </p>
        {hasActiveFilters ? (
          <Button className="mt-4" onClick={onResetFilters} type="button" variant="secondary">
            Reset bộ lọc
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-2xl border border-white/10 lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-[22%] px-3 py-2.5">Tác giả</th>
              <th className="w-[14%] px-3 py-2.5">Studio</th>
              <th className="w-[14%] px-3 py-2.5">Kiếm tiền</th>
              <th className="w-[10%] px-3 py-2.5">Xác minh</th>
              <th className="w-[16%] px-3 py-2.5">Nội dung</th>
              <th className="w-[14%] px-3 py-2.5">Doanh thu / Rút</th>
              <th className="w-[10%] px-3 py-2.5">Chất lượng</th>
              <th className="w-[10%] px-3 py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((row) => (
              <CreatorDesktopRow
                key={row.userId}
                onOpenModal={(t) => onOpenModalFromRow?.(row, t)}
                onOpenTab={(tab) => onOpenTabFromRow?.(row, tab)}
                onView={() => onView(row)}
                row={row}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {creators.map((row) => (
          <CreatorMobileCard
            key={row.userId}
            onOpenModal={(t) => onOpenModalFromRow?.(row, t)}
            onOpenTab={(tab) => onOpenTabFromRow?.(row, tab)}
            onView={() => onView(row)}
            row={row}
          />
        ))}
      </div>
    </>
  );
}

function CreatorDesktopRow({
  row,
  onView,
  onOpenModal,
  onOpenTab
}: {
  row: AdminCreatorListRow;
  onView: () => void;
  onOpenModal?: (type: CreatorModalType) => void;
  onOpenTab?: (tab: string) => void;
}) {
  const label = row.displayName ?? row.username ?? "—";
  const needs = getCreatorNeedsActionLabels(row);
  const statusLine = getCreatorActionStatusLabel(row);

  return (
    <tr className="border-t border-white/5 align-top hover:bg-white/[0.02]">
      <td className="px-3 py-3">
        <div className="flex gap-2.5">
          <Avatar avatarUrl={row.avatarUrl} label={label} size={40} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{label}</p>
            {row.username ? (
              <p className="truncate text-xs text-zinc-500">@{row.username}</p>
            ) : null}
            {row.email ? (
              <p className="truncate text-[11px] text-zinc-600">{row.email}</p>
            ) : null}
            <p
              className={`mt-1 text-[11px] ${needs.length ? "text-amber-300" : "text-zinc-600"}`}
            >
              {statusLine}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <p className="truncate font-medium text-zinc-200">{row.studioName ?? "—"}</p>
        <p className="text-[11px] text-zinc-500">{formatStudioStatusLabel(row.studioStatus)}</p>
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${monetizationStatusBadgeClass(row.monetizationStatus)}`}
        >
          {formatMonetizationStatusLabel(row.monetizationStatus)}
        </span>
        <p className="mt-1 text-[11px] text-zinc-500">
          Rút tiền: {row.payoutEnabled ? "Bật" : "Tắt"}
        </p>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-400">{verificationLabel(row)}</td>
      <td className="px-3 py-3 text-[11px] leading-snug text-zinc-400">
        {formatCreatorContentLine(row)}
      </td>
      <td className="px-3 py-3 text-[11px] leading-snug text-zinc-300">
        <p>Ròng: {formatVnd(row.netRevenueVnd)}</p>
        <p className="text-zinc-500">Rút: {formatVnd(row.availableBalanceVnd)}</p>
        {row.pendingPayoutCount > 0 ? (
          <p className="text-amber-300">{row.pendingPayoutCount} yêu cầu chờ</p>
        ) : null}
      </td>
      <td className="px-3 py-3 text-[11px] text-zinc-400">{qualityLabel(row)}</td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button onClick={onView} type="button" variant="secondary">
            Xem
          </Button>
          <CreatorRowMenu
            onOpenModal={onOpenModal}
            onOpenTab={onOpenTab}
            onView={onView}
            row={row}
          />
        </div>
      </td>
    </tr>
  );
}

function CreatorMobileCard({
  row,
  onView,
  onOpenModal,
  onOpenTab
}: {
  row: AdminCreatorListRow;
  onView: () => void;
  onOpenModal?: (type: CreatorModalType) => void;
  onOpenTab?: (tab: string) => void;
}) {
  const label = row.displayName ?? row.username ?? "—";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex gap-3">
        <Avatar avatarUrl={row.avatarUrl} label={label} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{label}</p>
          <p className="text-xs text-zinc-500">{row.studioName ?? "Chưa có Studio"}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{getCreatorActionStatusLabel(row)}</p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${monetizationStatusBadgeClass(row.monetizationStatus)}`}
        >
          {formatMonetizationStatusLabel(row.monetizationStatus)}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-500">{formatCreatorContentLine(row)}</p>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={onView} type="button" variant="secondary">
          Xem
        </Button>
        <CreatorRowMenu
          onOpenModal={onOpenModal}
          onOpenTab={onOpenTab}
          onView={onView}
          row={row}
        />
      </div>
    </div>
  );
}

function Avatar({
  avatarUrl,
  label,
  size
}: {
  avatarUrl: string | null;
  label: string;
  size: number;
}) {
  const cls = `shrink-0 rounded-full object-cover`;
  const dim = { width: size, height: size };
  if (avatarUrl) {
    return <img alt="" className={cls} src={avatarUrl} style={dim} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400"
      style={dim}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}
