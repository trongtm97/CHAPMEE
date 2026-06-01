import Link from "next/link";
import { analyticsCard } from "@/components/studio/analytics/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { StudioContentHealthIssue } from "@/types/studio-analytics";

const priorityLabel = {
  high: "Cao",
  low: "Thấp",
  medium: "Vừa"
};

const priorityClass = {
  high: "text-red-200 border-red-400/30",
  low: "text-zinc-400 border-zinc-500/30",
  medium: "text-amber-200 border-amber-400/30"
};

type ContentHealthSectionProps = {
  issues: StudioContentHealthIssue[];
  total: number;
};

export function ContentHealthSection({ issues, total }: ContentHealthSectionProps) {
  if (issues.length === 0) {
    return (
      <section className={`${analyticsCard} p-4`}>
        <h2 className="text-base font-bold text-white">Sức khỏe nội dung</h2>
        <p className="mt-2 text-sm text-emerald-300/90">
          Không có vấn đề ưu tiên — tiếp tục duy trì chất lượng nội dung.
        </p>
      </section>
    );
  }

  return (
    <section className={`${analyticsCard} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white">Sức khỏe nội dung</h2>
        {total > issues.length ? (
          <Link
            className="text-xs font-semibold text-cyan-300"
            href={studioPath("/content-health")}
          >
            Xem tất cả ({total})
          </Link>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2">
        {issues.map((issue) => (
          <li
            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
            key={issue.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-100">{issue.title}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityClass[issue.priority]}`}
                >
                  {priorityLabel[issue.priority]}
                </span>
                <span className="text-xs text-zinc-500">{issue.count} mục</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{issue.description}</p>
            </div>
            <Link
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-cyan-300/90 px-3 text-xs font-semibold text-zinc-950 hover:bg-cyan-200"
              href={issue.ctaHref}
            >
              {issue.ctaLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
