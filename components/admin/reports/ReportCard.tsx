import Link from "next/link";
import { ModerationActionPanel } from "@/components/admin/moderation/ModerationActionPanel";
import { ReportActionForm } from "@/components/admin/reports/ReportActionForm";
import { Badge, Card } from "@/components/ui";
import type { AdminReport } from "@/lib/admin/getReports";

type ReportCardProps = {
  report: AdminReport;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ReportCard({ report }: ReportCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">
            {report.targetType} · {report.targetId}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {report.reason}
          </h2>
        </div>
        <Badge variant={report.status === "pending" ? "warning" : "default"}>
          {report.status}
        </Badge>
      </div>

      {report.details ? (
        <p className="text-sm leading-6 text-zinc-300">{report.details}</p>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">
          Users không nhập chi tiết.
        </p>
      )}

      <dl className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Reporter</dt>
          <dd>{report.reporterName ?? "Không rõ"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Created</dt>
          <dd>{formatDate(report.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Updated</dt>
          <dd>{formatDate(report.updatedAt)}</dd>
        </div>
      </dl>

      {report.targetHref ? (
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={report.targetHref}
        >
          Mở target
        </Link>
      ) : null}

      <ReportActionForm reportId={report.id} status={report.status} />
      <ModerationActionPanel
        reportId={report.id}
        status={report.status}
        targetType={report.targetType}
      />
    </Card>
  );
}
