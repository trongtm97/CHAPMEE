"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createMessagingRestrictionAction } from "@/lib/admin/messaging-safety-actions";
import {
  MESSAGING_RESTRICT_REASON_LABELS,
  MESSAGING_RESTRICTION_LABELS,
  restrictionEndsAt
} from "@/lib/messaging/labels";
import type {
  MessagingRestrictionType,
  MessagingRestrictReasonCode
} from "@/types/messaging-safety";

type Props = {
  moderatorId: string;
  userId: string;
  userLabel: string;
  onClose: () => void;
  onSuccess: () => void;
};

const RESTRICTION_TYPES = Object.entries(MESSAGING_RESTRICTION_LABELS) as [
  MessagingRestrictionType,
  string
][];

const REASON_CODES = Object.entries(MESSAGING_RESTRICT_REASON_LABELS) as [
  MessagingRestrictReasonCode,
  string
][];

export function MessagingRestrictionModal({
  moderatorId,
  userId,
  userLabel,
  onClose,
  onSuccess
}: Props) {
  const [pending, startTransition] = useTransition();
  const [restrictionType, setRestrictionType] =
    useState<MessagingRestrictionType>("mute_24h");
  const [reasonCode, setReasonCode] =
    useState<MessagingRestrictReasonCode>("spam");
  const [note, setNote] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);

  const endsAt = restrictionEndsAt(restrictionType);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#0b1016] p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">Hạn chế nhắn tin</h3>
        <p className="text-sm text-zinc-400">{userLabel}</p>

        <label className="block text-xs text-zinc-500">
          Loại hạn chế *
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-2 text-sm text-zinc-200"
            onChange={(e) =>
              setRestrictionType(e.target.value as MessagingRestrictionType)
            }
            value={restrictionType}
          >
            {RESTRICTION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-zinc-500">
          Lý do *
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-2 text-sm text-zinc-200"
            onChange={(e) =>
              setReasonCode(e.target.value as MessagingRestrictReasonCode)
            }
            value={reasonCode}
          >
            {REASON_CODES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-zinc-500">
          Ghi chú nội bộ
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200"
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            value={note}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={notifyUser}
            onChange={(e) => setNotifyUser(e.target.checked)}
            type="checkbox"
          />
          Gửi thông báo cho người dùng
        </label>

        <p className="text-xs text-zinc-500">
          Kết thúc dự kiến:{" "}
          {endsAt
            ? endsAt.toLocaleString("vi-VN")
            : "Vĩnh viễn / cho đến khi admin gỡ"}
        </p>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Hủy
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await createMessagingRestrictionAction({
                  moderatorId,
                  userId,
                  restrictionType,
                  reasonCode,
                  note: note.trim() || null,
                  notifyUser
                });
                if (result.ok) {
                  onSuccess();
                  onClose();
                }
              })
            }
            type="button"
            variant="danger"
          >
            Áp dụng
          </Button>
        </div>
      </div>
    </div>
  );
}
