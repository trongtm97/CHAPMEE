"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { COMMUNITY_REJECT_REASON_OPTIONS } from "@/lib/admin/community-admin-labels";
import type {
  CommunityPostActionKind,
  CommunityRejectReasonCode
} from "@/types/community-admin";

type CommunityActionModalProps = {
  open: boolean;
  action: CommunityPostActionKind;
  title: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reasonCode: CommunityRejectReasonCode | null;
    note: string;
    hiddenReason?: string;
  }) => void;
};

export function CommunityActionModal({
  open,
  action,
  title,
  loading,
  onClose,
  onConfirm
}: CommunityActionModalProps) {
  const [reasonCode, setReasonCode] = useState<CommunityRejectReasonCode>("spam");
  const [note, setNote] = useState("");
  const [hiddenReason, setHiddenReason] = useState("");

  if (!open) return null;

  const needsReason = action === "reject";
  const needsHideReason = action === "hide";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        {needsReason ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Lý do</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setReasonCode(e.target.value as CommunityRejectReasonCode)}
              value={reasonCode}
            >
              {COMMUNITY_REJECT_REASON_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {needsHideReason ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Lý do ẩn</span>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setHiddenReason(e.target.value)}
              placeholder="Lý do ẩn khỏi feed..."
              value={hiddenReason}
            />
          </label>
        ) : null}

        {(needsReason || needsHideReason) && (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">
              {needsReason && reasonCode === "other"
                ? "Ghi chú (bắt buộc nếu chọn Khác)"
                : "Ghi chú"}
            </span>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setNote(e.target.value)}
              value={note}
            />
          </label>
        )}

        <div className="flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button
            disabled={
              loading ||
              (needsReason && reasonCode === "other" && note.trim().length < 5) ||
              (needsHideReason && !hiddenReason.trim() && !note.trim())
            }
            onClick={() =>
              onConfirm({
                reasonCode: needsReason ? reasonCode : null,
                note: note.trim(),
                hiddenReason: hiddenReason.trim() || note.trim()
              })
            }
            type="button"
            variant={action === "reject" ? "danger" : "primary"}
          >
            {loading ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
