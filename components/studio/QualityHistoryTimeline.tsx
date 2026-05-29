import type { ContentQualityReviewRecord } from "@/types/content-quality";
import { qualityReasonLabel, qualityStatusLabel } from "@/lib/content-quality/labels";

type QualityHistoryTimelineProps = {
  history: ContentQualityReviewRecord[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function QualityHistoryTimeline({ history }: QualityHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Chưa có lịch sử xử lý chất lượng.</p>
    );
  }

  return (
    <ol className="space-y-3 border-l border-white/10 pl-4">
      {history.map((entry) => (
        <li className="relative" key={entry.id}>
          <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-300" />
          <p className="text-sm font-semibold text-white">
            {qualityStatusLabel(entry.status)}
            {entry.attemptNumber > 0 ? ` · Lần ${entry.attemptNumber}` : null}
          </p>
          <p className="text-xs text-zinc-500">{formatDate(entry.createdAt)}</p>
          {entry.reasonCodes.length > 0 ? (
            <ul className="mt-1 list-disc pl-4 text-sm text-zinc-400">
              {entry.reasonCodes.map((code) => (
                <li key={`${entry.id}-${code}`}>{qualityReasonLabel(code)}</li>
              ))}
            </ul>
          ) : null}
          {entry.moderatorNote ? (
            <p className="mt-1 text-sm text-zinc-300">
              Ghi chú moderator: {entry.moderatorNote}
            </p>
          ) : null}
          {entry.authorNote ? (
            <p className="mt-1 text-sm text-zinc-300">
              Ghi chú tác giả: {entry.authorNote}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
