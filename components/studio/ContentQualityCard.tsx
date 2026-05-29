import { qualityReasonLabel, qualityStatusLabel } from "@/lib/content-quality/labels";
import type { ContentQualityListItem } from "@/types/content-quality";

type ContentQualityCardProps = {
  item: ContentQualityListItem;
  onOpenDetail: (storyId: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function statusTone(status: ContentQualityListItem["qualityStatus"]) {
  if (status === "permanently_hidden_low_quality") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }

  if (
    status === "low_quality_warning_1" ||
    status === "low_quality_warning_2" ||
    status === "low_quality_final_review"
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }

  if (status === "restored") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.03] text-zinc-200";
}

export function ContentQualityCard({ item, onOpenDetail }: ContentQualityCardProps) {
  return (
    <article
      className={`rounded-2xl border p-4 ${statusTone(item.qualityStatus)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white">{item.title}</h3>
          {item.subtitle ? (
            <p className="text-sm text-zinc-400">{item.subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-semibold">
          {qualityStatusLabel(item.qualityStatus)}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Lần cảnh báo</dt>
          <dd className="font-medium">{item.attemptCount}/3</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Ngày cảnh báo</dt>
          <dd className="font-medium">{formatDate(item.warnedAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-zinc-500">Lý do chính</dt>
          <dd className="font-medium">
            {item.primaryReasonLabel ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-9 items-center rounded-full bg-sky-300 px-4 text-xs font-bold text-zinc-950"
          onClick={() => onOpenDetail(item.storyId)}
          type="button"
        >
          Xem chi tiết
        </button>
        <a
          className="inline-flex min-h-9 items-center rounded-full border border-white/10 px-4 text-xs font-semibold text-zinc-200 hover:bg-white/5"
          href={item.editHref}
        >
          Sửa nội dung
        </a>
      </div>

      {item.reasonCodes.length > 1 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Thêm:{" "}
          {item.reasonCodes
            .slice(1)
            .map((code) => qualityReasonLabel(code))
            .join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
