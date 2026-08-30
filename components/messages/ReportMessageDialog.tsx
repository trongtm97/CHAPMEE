"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import { reportConversationAction } from "@/lib/actions/messages";
import {
  messageActionEmptyState,
  type MessageActionState
} from "@/lib/actions/message-action-state";
import { messageReportReasons } from "@/types/messages";

type ReportMessageDialogProps = {
  conversationId: string;
  reportedUserId: string;
  messageId?: string | null;
  onClose: () => void;
  variant?: "conversation" | "message";
};

export function ReportMessageDialog({
  conversationId,
  reportedUserId,
  messageId,
  onClose,
  variant = "conversation"
}: ReportMessageDialogProps) {
  const title =
    variant === "message" ? "Báo cáo tin nhắn" : "Báo cáo cuộc trò chuyện";
  const [open, setOpen] = useState(true);
  const [state, formAction, pending] = useActionState<MessageActionState, FormData>(
    reportConversationAction,
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
        <h3 className="text-base font-bold text-white">{title}</h3>
        <input name="conversationId" type="hidden" value={conversationId} />
        <input name="reportedUserId" type="hidden" value={reportedUserId} />
        {messageId ? <input name="messageId" type="hidden" value={messageId} /> : null}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs text-zinc-500">Chọn lý do *</legend>
          {messageReportReasons.map((reason, index) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200"
              key={reason.value}
            >
              <input
                defaultChecked={index === 0}
                name="reasonCode"
                required
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
