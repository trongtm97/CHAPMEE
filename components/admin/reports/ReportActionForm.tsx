import { Button } from "@/components/ui";
import {
  markReportReviewingAction,
  rejectReportAction,
  resolveReportAction
} from "@/lib/admin/updateReportStatus";

type ReportActionFormProps = {
  reportId: string;
  status: string;
};

export function ReportActionForm({ reportId, status }: ReportActionFormProps) {
  return (
    <div className="grid gap-3">
      {status === "pending" || status === "reviewing" ? (
        <>
          <form action={markReportReviewingAction}>
            <input name="report_id" type="hidden" value={reportId} />
            <Button className="w-full" type="submit" variant="secondary">
              Mark reviewing
            </Button>
          </form>

          <form action={resolveReportAction} className="space-y-2">
            <input name="report_id" type="hidden" value={reportId} />
            <textarea
              className="min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
              maxLength={1000}
              name="moderation_note"
              placeholder="Admin note khi resolve."
            />
            <Button className="w-full" type="submit">
              Resolve
            </Button>
          </form>

          <form action={rejectReportAction} className="space-y-2">
            <input name="report_id" type="hidden" value={reportId} />
            <textarea
              className="min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
              maxLength={1000}
              name="moderation_note"
              placeholder="Admin note khi reject report."
            />
            <Button className="w-full" type="submit" variant="danger">
              Reject report
            </Button>
          </form>
        </>
      ) : (
        <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
          Report này đã được đóng.
        </p>
      )}
    </div>
  );
}
