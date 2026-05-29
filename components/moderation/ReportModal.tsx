"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  createReportAction,
  type ReportState,
  type ReportTargetType
} from "@/lib/reports/createReport";
import { REPORT_REASON_OPTIONS } from "@/lib/moderation/moderation-rules";

type ReportModalProps = {
  targetId: string;
  targetType: ReportTargetType;
  returnTo: string;
  onClose?: () => void;
  triggerLabel?: string;
  /** Mở sẵn, không hiện nút trigger (dùng trong menu ⋯) */
  defaultOpen?: boolean;
  hideTrigger?: boolean;
};

const initialState: ReportState = { error: null, success: null };

export function ReportModal({
  defaultOpen = false,
  hideTrigger = false,
  onClose,
  returnTo,
  targetId,
  targetType,
  triggerLabel = "Báo cáo"
}: ReportModalProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [reasonCode, setReasonCode] = useState("");
  const [state, formAction, pending] = useActionState(createReportAction, initialState);

  const showCopyrightFields = reasonCode === "copyright";

  return (
    <>
      {!hideTrigger ? (
        <Button
          className="w-full"
          onClick={() => setOpen(true)}
          type="button"
          variant="ghost"
        >
          {triggerLabel}
        </Button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center">
          <button
            aria-label="Đóng"
            className="absolute inset-0"
            onClick={() => {
              setOpen(false);
              onClose?.();
            }}
            type="button"
          />
          <Card className="relative z-10 max-h-[90vh] w-full space-y-4 overflow-y-auto p-4 sm:max-w-[28rem] sm:p-5">
            <div>
              <p className="text-base font-black text-white">Báo cáo vi phạm</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Báo cáo sẽ được đội ngũ ChapMee xem xét. Nội dung không bị gỡ tự
                động chỉ vì bị báo cáo.
              </p>
              <Link
                className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200"
                href="/community-guidelines"
                target="_blank"
              >
                Xem quy định cộng đồng
              </Link>
            </div>
            <form action={formAction} className="space-y-4">
              <input name="target_type" type="hidden" value={targetType} />
              <input name="target_id" type="hidden" value={targetId} />
              <input name="return_to" type="hidden" value={returnTo} />
              <label className="space-y-2">
                <span className="block text-sm font-medium text-zinc-200">
                  Lý do
                </span>
                <select
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
                  name="reason_code"
                  onChange={(e) => setReasonCode(e.target.value)}
                  required
                  value={reasonCode}
                >
                  <option value="">Chọn lý do</option>
                  {REPORT_REASON_OPTIONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </label>
              {showCopyrightFields ? (
                <>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-zinc-200">
                      Link tác phẩm gốc
                    </span>
                    <input
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
                      name="original_work_url"
                      placeholder="https://..."
                      type="url"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-zinc-200">
                      Giải thích vi phạm bản quyền
                    </span>
                    <textarea
                      className="min-h-20 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
                      name="copyright_explanation"
                      placeholder="Mô tả tác phẩm gốc và phần bị sao chép."
                    />
                  </label>
                </>
              ) : null}
              <label className="space-y-2">
                <span className="block text-sm font-medium text-zinc-200">
                  Mô tả thêm (tuỳ chọn)
                </span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
                  maxLength={1000}
                  name="reason_detail"
                  placeholder="Thêm chi tiết nếu cần."
                />
              </label>
              {state.error ? (
                <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                  {state.error}
                </p>
              ) : null}
              {state.success ? (
                <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                  {state.success}
                </p>
              ) : null}
              <Button className="w-full" loading={pending} type="submit">
                Gửi báo cáo
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}
