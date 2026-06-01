"use client";

import { CREATOR_FEE_CREATOR_TYPE_LABELS, CREATOR_FEE_STATUS_LABELS } from "@/lib/admin/creator-fee-policies/constants";
import type { CreatorFeePolicyAdminCapabilities, CreatorFeePolicyListRow } from "@/types/admin-creator-fee-policy";

export type CreatorFeePolicyRowAction = "view" | "edit" | "pause" | "revoke" | "duplicate" | "history";

type Props = {
  rows: CreatorFeePolicyListRow[];
  capabilities: CreatorFeePolicyAdminCapabilities;
  onAction: (action: CreatorFeePolicyRowAction, row: CreatorFeePolicyListRow) => void;
  selectedId?: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-300",
    scheduled: "bg-cyan-500/20 text-cyan-300",
    draft: "bg-zinc-500/20 text-zinc-300",
    expired: "bg-zinc-600/20 text-zinc-400",
    paused: "bg-amber-500/20 text-amber-300",
    disabled: "bg-amber-500/20 text-amber-300",
    revoked: "bg-rose-500/20 text-rose-300"
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {CREATOR_FEE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function pct(a: number | null, b: number | null) {
  if (a == null) return "—";
  return `${a}/${b ?? "—"}%`;
}

function ActionBtn({
  label,
  onClick,
  danger
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`rounded px-2 py-1 text-xs ${
        danger ? "text-rose-300 hover:bg-rose-500/10" : "text-cyan-300 hover:bg-cyan-500/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function CreatorFeePolicyTable({ rows, capabilities, onAction, selectedId }: Props) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
      <table className="min-w-[1100px] w-full text-sm">
        <thead className="bg-white/[0.03] text-left text-xs text-zinc-500">
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-900/95 px-3 py-2">Tác giả</th>
            <th className="px-3 py-2">Loại</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Bắt đầu</th>
            <th className="px-3 py-2">Kết thúc</th>
            <th className="px-3 py-2">Paid ch.</th>
            <th className="px-3 py-2">Tip</th>
            <th className="px-3 py-2">VIP/FC</th>
            <th className="px-3 py-2">Gift</th>
            <th className="px-3 py-2">Sponsor</th>
            <th className="px-3 py-2">Cập nhật</th>
            <th className="px-3 py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={`border-t border-white/5 ${selectedId === row.id ? "bg-cyan-500/5" : "hover:bg-white/[0.02]"}`}
              key={row.id}
            >
              <td className="sticky left-0 z-10 bg-zinc-900/95 px-3 py-2">
                <div className="flex items-center gap-2">
                  {row.creatorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-8 w-8 rounded-full object-cover" src={row.creatorAvatarUrl} />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs text-white">
                      {(row.creatorDisplayName[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{row.creatorDisplayName}</p>
                    <p className="text-xs text-zinc-500">
                      @{row.creatorUsername ?? "—"}
                      {row.studioName ? ` · ${row.studioName}` : ""}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {row.creatorType ? CREATOR_FEE_CREATOR_TYPE_LABELS[row.creatorType] : "—"}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {new Date(row.startsAt).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {row.endsAt ? new Date(row.endsAt).toLocaleDateString("vi-VN") : "—"}
              </td>
              <td className="px-3 py-2 text-zinc-300">
                {pct(row.paidChapterAuthorPercent, row.paidChapterPlatformPercent)}
              </td>
              <td className="px-3 py-2 text-zinc-300">
                {pct(row.tipAuthorPercent, row.tipPlatformPercent)}
              </td>
              <td className="px-3 py-2 text-zinc-300">
                {pct(row.vipAuthorPercent, row.vipPlatformPercent)}
              </td>
              <td className="px-3 py-2 text-zinc-300">
                {pct(row.giftAuthorPercent, row.giftPlatformPercent)}
              </td>
              <td className="px-3 py-2 text-zinc-300">
                {pct(row.sponsoredAuthorPercent, row.sponsoredPlatformPercent)}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {row.updatedByLabel ?? "—"}
                <br />
                {new Date(row.updatedAt).toLocaleString("vi-VN")}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <ActionBtn label="Xem" onClick={() => onAction("view", row)} />
                  {capabilities.canUpdate ? (
                    <ActionBtn label="Sửa" onClick={() => onAction("edit", row)} />
                  ) : null}
                  {capabilities.canPause && ["active", "scheduled"].includes(row.status) ? (
                    <ActionBtn danger label="Tạm dừng" onClick={() => onAction("pause", row)} />
                  ) : null}
                  {capabilities.canRevoke && !["revoked", "expired"].includes(row.status) ? (
                    <ActionBtn danger label="Thu hồi" onClick={() => onAction("revoke", row)} />
                  ) : null}
                  {capabilities.canCreate ? (
                    <ActionBtn label="Nhân bản" onClick={() => onAction("duplicate", row)} />
                  ) : null}
                  <ActionBtn label="Lịch sử" onClick={() => onAction("history", row)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CreatorFeePolicyCardList({ rows, capabilities, onAction, selectedId }: Props) {
  return (
    <div className="space-y-3 lg:hidden">
      {rows.map((row) => (
        <article
          className={`rounded-xl border p-4 ${
            selectedId === row.id ? "border-cyan-400/40 bg-cyan-500/5" : "border-white/10 bg-white/[0.02]"
          }`}
          key={row.id}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-white">{row.creatorDisplayName}</p>
              <p className="text-xs text-zinc-500">@{row.creatorUsername ?? "—"}</p>
              <p className="text-xs text-zinc-500">{row.policyName}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <span>Paid: {pct(row.paidChapterAuthorPercent, row.paidChapterPlatformPercent)}</span>
            <span>Tip: {pct(row.tipAuthorPercent, row.tipPlatformPercent)}</span>
            <span>
              Từ {new Date(row.startsAt).toLocaleDateString("vi-VN")}
            </span>
            <span>
              {row.endsAt ? `Đến ${new Date(row.endsAt).toLocaleDateString("vi-VN")}` : "Không giới hạn"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionBtn label="Xem" onClick={() => onAction("view", row)} />
            {capabilities.canUpdate ? <ActionBtn label="Sửa" onClick={() => onAction("edit", row)} /> : null}
            {capabilities.canPause && ["active", "scheduled"].includes(row.status) ? (
              <ActionBtn danger label="Tạm dừng" onClick={() => onAction("pause", row)} />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
