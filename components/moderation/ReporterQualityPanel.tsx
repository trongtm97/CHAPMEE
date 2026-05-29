import { Badge, Button, Card } from "@/components/ui";
import {
  enforceReporterAbuseAction,
  markReportAbuseAction
} from "@/lib/moderation/report-abuse-actions";
import type { ReporterQualitySummary } from "@/types/moderation";

type ReporterQualityPanelProps = {
  reportId: string;
  reporterId: string;
  reporterName: string | null;
  quality: ReporterQualitySummary | null;
};

export function ReporterQualityPanel({
  quality,
  reportId,
  reporterId,
  reporterName
}: ReporterQualityPanelProps) {
  if (!quality && !reporterId) {
    return null;
  }

  const q = quality ?? {
    userId: reporterId,
    trustScore: 50,
    reportsSubmitted: 0,
    reportsValid: 0,
    reportsRejected: 0,
    reportsAbuse: 0,
    spamSuspected: false,
    accuracyPercent: null,
    displayName: reporterName
  };

  const wrongRate =
    q.reportsSubmitted > 0
      ? Math.round(
          ((q.reportsRejected + q.reportsAbuse) / q.reportsSubmitted) * 100
        )
      : 0;

  return (
    <Card className="space-y-3 border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Người báo cáo</p>
        {q.spamSuspected ? (
          <Badge variant="warning">Nghi spam report</Badge>
        ) : null}
      </div>
      <p className="text-xs text-zinc-400">
        {q.displayName ?? reporterName ?? reporterId}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
        <div>
          <dt className="text-zinc-500">Tổng báo cáo</dt>
          <dd className="font-semibold text-white">{q.reportsSubmitted}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Trust score</dt>
          <dd className="font-semibold text-white">{q.trustScore}/100</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Đúng (đã xử lý)</dt>
          <dd className="text-emerald-300">{q.reportsValid}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Không vi phạm / lạm dụng</dt>
          <dd className="text-amber-200">
            {q.reportsRejected + q.reportsAbuse}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Tỷ lệ báo cáo không có căn cứ</dt>
          <dd>
            {q.reportsSubmitted > 0 ? `${wrongRate}%` : "—"}
            {q.accuracyPercent != null
              ? ` · Độ chính xác ước tính: ${q.accuracyPercent}%`
              : null}
          </dd>
        </div>
      </dl>

      <form action={markReportAbuseAction} className="space-y-2 border-t border-white/10 pt-3">
        <input name="report_id" type="hidden" value={reportId} />
        <p className="text-xs text-zinc-500">
          Đánh dấu báo cáo này là lạm dụng (không có vi phạm thật).
        </p>
        <Button className="w-full" type="submit" variant="secondary">
          Báo cáo lạm dụng
        </Button>
      </form>

      {(q.spamSuspected || q.reportsAbuse >= 1 || wrongRate >= 50) && (
        <form
          action={enforceReporterAbuseAction}
          className="space-y-2 border-t border-white/10 pt-3"
        >
          <input name="reporter_id" type="hidden" value={reporterId} />
          <input name="report_id" type="hidden" value={reportId} />
          <p className="text-xs font-medium text-amber-200">Xử lý lạm dụng report</p>
          <select
            className="min-h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            name="enforcement"
            required
          >
            <option value="">Chọn hành động</option>
            <option value="warn">Cảnh cáo</option>
            <option value="restrict_reports">Hạn chế báo cáo (7 ngày)</option>
            <option value="violation">Vi phạm + hạn chế (30 ngày)</option>
          </select>
          <textarea
            className="min-h-16 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            name="note"
            placeholder="Ghi chú nội bộ (tuỳ chọn)."
          />
          <Button className="w-full" type="submit" variant="primary">
            Áp dụng
          </Button>
        </form>
      )}
    </Card>
  );
}
