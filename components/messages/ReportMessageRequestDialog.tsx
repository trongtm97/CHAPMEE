"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import {
  messageActionEmptyState,
  reportMessageRequestAction,
  type MessageActionState
} from "@/lib/actions/messages";
import { messageReportReasons } from "@/types/messages";

type ReportMessageRequestDialogProps = {
  requestId: string;
  reportedUserId: string;
  onClose: () => void;
};

export function ReportMessageRequestDialog({
  requestId,
  reportedUserId,
  onClose
}: ReportMessageRequestDialogProps) {
  const [open, setOpen] = useState(true);
  const [state, formAction, pending] = useActionState<MessageActionState, FormData>(
    reportMessageRequestAction,
    messageActionEmptyState
  );

  if (!open) return null;

  if (state.ok) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121820] p-4">
          <p className="text-sm text-zinc-200">Đã gửi báo cáo. Cảm ơn bạn.</p>
          <Button className="mt-3 w-full" onClick={onClose} type="button">
            Đóng
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        action={formAction}
        className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#121820] p-4"
      >
        <h3 className="text-base font-bold text-white">Báo cáo yêu cầu tin nhắn</h3>
        <input name="messageRequestId" type="hidden" value={requestId} />
        <input name="reportedUserId" type="hidden" value={reportedUserId} />
        <fieldset className="space-y-2">
          {messageReportReasons.map((reason) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200"
              key={reason.value}
            >
              <input
                defaultChecked={reason.value === "harassment"}
                name="reasonCode"
                type="radio"
                value={reason.value}
              />
              {reason.label}
            </label>
          ))}
        </fieldset>
        <textarea
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          name="detail"
          placeholder="Mô tả thêm (tuỳ chọn)"
          rows={3}
        />
        {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              setOpen(false);
              onClose();
            }}
            type="button"
            variant="ghost"
          >
            Huỷ
          </Button>
          <Button className="flex-1" loading={pending} type="submit" variant="danger">
            Gửi báo cáo
          </Button>
        </div>
      </form>
    </div>
  );
}
