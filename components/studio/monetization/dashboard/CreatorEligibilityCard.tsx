import Link from "next/link";
import type { MonetizationEligibilityItem } from "@/types/studio-monetization-dashboard";

const STATUS_SYMBOL = {
  ok: "✓",
  missing: "○",
  warning: "!",
  locked: "⊘"
} as const;

const STATUS_CLASS = {
  ok: "text-emerald-400 border-emerald-400/30 bg-emerald-500/10",
  missing: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
  warning: "text-amber-400 border-amber-400/30 bg-amber-500/10",
  locked: "text-rose-400 border-rose-400/30 bg-rose-500/10"
} as const;

type CreatorEligibilityCardProps = {
  items: MonetizationEligibilityItem[];
};

export function CreatorEligibilityCard({ items }: CreatorEligibilityCardProps) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5"
      id="eligibility"
    >
      <h2 className="text-sm font-semibold text-white">Trạng thái kiếm tiền</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Điều kiện đọc từ cấu hình quản trị — hoàn tất từng mục để nhận tiền đầy đủ.
      </p>

      <ul className="mt-4 space-y-3">
        {items.map((row) => (
          <li
            className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
            key={row.id}
          >
            <span
              aria-hidden
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${STATUS_CLASS[row.status]}`}
            >
              {STATUS_SYMBOL[row.status]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-100">{row.label}</p>
              {row.description ? (
                <p className="mt-0.5 text-xs text-zinc-500">{row.description}</p>
              ) : null}
              {row.href && row.ctaLabel ? (
                <Link
                  className="mt-1.5 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  href={row.href}
                >
                  {row.ctaLabel} →
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
