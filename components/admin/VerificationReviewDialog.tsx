"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  approveVerificationAction,
  rejectVerificationAction,
  updateVerificationRecordAction
} from "@/lib/admin/grant-verification";
import { revokeVerificationAction } from "@/lib/admin/revoke-verification";
import type { AdminVerificationListItem } from "@/types/verification";
import {
  VERIFICATION_TYPES,
  VERIFICATION_TYPE_LABELS,
  type VerificationType
} from "@/types/verification";

type VerificationReviewDialogProps = {
  item: AdminVerificationListItem | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function VerificationReviewDialog({
  item,
  onClose,
  onUpdated,
  open
}: VerificationReviewDialogProps) {
  const [adminNote, setAdminNote] = useState("");
  const [publicLabel, setPublicLabel] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [verificationType, setVerificationType] = useState<VerificationType>(
    "identity_verified"
  );
  const [displayBadge, setDisplayBadge] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open || !item) {
    return null;
  }

  const displayName = item.displayName ?? item.username ?? item.userId;

  function run(action: () => Promise<{ ok: boolean; error: string | null }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("Đã lưu.");
      onUpdated();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{displayName}</h2>
            <p className="text-sm text-zinc-400">
              @{item.username ?? "—"} · {VERIFICATION_TYPE_LABELS[item.verificationType]}
            </p>
            {item.email ? (
              <p className="mt-1 text-xs text-zinc-500">{item.email}</p>
            ) : null}
          </div>
          <button
            className="text-sm text-zinc-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        {item.requestReason ? (
          <p className="mt-4 rounded-lg bg-white/[0.03] p-3 text-sm text-zinc-300">
            <span className="font-semibold text-white">Lý do gửi: </span>
            {item.requestReason}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Nhãn công khai (tuỳ chọn)</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => setPublicLabel(event.target.value)}
              value={publicLabel}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Ghi chú nội bộ</span>
            <textarea
              className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => setAdminNote(event.target.value)}
              value={adminNote}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={displayBadge}
              onChange={(event) => setDisplayBadge(event.target.checked)}
              type="checkbox"
            />
            Hiển thị badge công khai
          </label>
          {item.status === "approved" ? (
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Đổi loại badge</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                onChange={(event) =>
                  setVerificationType(event.target.value as VerificationType)
                }
                value={verificationType}
              >
                {VERIFICATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {VERIFICATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {item.status === "pending" ? (
            <>
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    approveVerificationAction({
                      requestId: item.id,
                      adminNote: adminNote || null,
                      publicBadgeEnabled: displayBadge,
                      publicLabel: publicLabel || null
                    })
                  )
                }
                type="button"
              >
                Duyệt
              </Button>
              <Button
                disabled={isPending}
                onClick={() => {
                  if (!rejectReason.trim()) {
                    setMessage("Nhập lý do từ chối.");
                    return;
                  }
                  run(() =>
                    rejectVerificationAction({
                      requestId: item.id,
                      reason: rejectReason,
                      adminNote
                    })
                  );
                }}
                type="button"
                variant="ghost"
              >
                Từ chối
              </Button>
            </>
          ) : null}
          {item.status === "approved" ? (
            <>
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    updateVerificationRecordAction({
                      requestId: item.id,
                      verificationType,
                      publicBadgeEnabled: displayBadge,
                      publicLabel: publicLabel || null,
                      adminNote
                    })
                  )
                }
                type="button"
              >
                Lưu thay đổi
              </Button>
              <Button
                disabled={isPending}
                onClick={() => {
                  if (!revokeReason.trim()) {
                    setMessage("Nhập lý do thu hồi.");
                    return;
                  }
                  run(() =>
                    revokeVerificationAction({
                      requestId: item.id,
                      revokeReason,
                      adminNote
                    })
                  );
                }}
                type="button"
                variant="ghost"
              >
                Thu hồi
              </Button>
            </>
          ) : null}
        </div>

        {item.status === "pending" ? (
          <label className="mt-3 block space-y-1 text-sm">
            <span className="text-zinc-400">Lý do từ chối (hiển thị cho user nếu có)</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => setRejectReason(event.target.value)}
              value={rejectReason}
            />
          </label>
        ) : null}

        {item.status === "approved" ? (
          <label className="mt-3 block space-y-1 text-sm">
            <span className="text-zinc-400">Lý do thu hồi</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              onChange={(event) => setRevokeReason(event.target.value)}
              value={revokeReason}
            />
          </label>
        ) : null}

        {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
      </div>
    </div>
  );
}
