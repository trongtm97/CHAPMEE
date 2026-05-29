"use client";

import { useActionState, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  createReportAction,
  type ReportState,
  type ReportTargetType
} from "@/lib/reports/createReport";

type ReportDialogProps = {
  targetId: string;
  targetType: ReportTargetType;
  returnTo: string;
};

const reasons = [
  { label: "Spam", value: "spam" },
  { label: "Harassment", value: "harassment" },
  { label: "Illegal content", value: "illegal_content" },
  { label: "Copyright", value: "copyright" },
  { label: "Adult content", value: "adult_content" },
  { label: "Violence", value: "violence" },
  { label: "Hate", value: "hate" },
  { label: "Other", value: "other" }
];

const initialState: ReportState = {
  error: null,
  success: null
};

export function ReportDialog({
  returnTo,
  targetId,
  targetType
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createReportAction,
    initialState
  );

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        onClick={() => setOpen((current) => !current)}
        type="button"
        variant="ghost"
      >
        Report
      </Button>
      {open ? (
        <Card className="space-y-4 border-zinc-700 bg-zinc-950">
          <div>
            <p className="text-base font-semibold text-white">Report nội dung</p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Report sẽ được gửi tới admin/moderator. Nội dung không bị xóa tự
              động.
            </p>
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
                className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300"
                name="reason"
                required
              >
                <option value="">Chọn lý do</option>
                {reasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-zinc-200">
                Chi tiết
              </span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
                maxLength={1000}
                name="details"
                placeholder="Thêm chi tiết nếu cần."
              />
            </label>

            {state.error ? (
              <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                {state.success}
              </p>
            ) : null}

            <Button className="w-full" loading={pending} type="submit">
              Gửi report
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
