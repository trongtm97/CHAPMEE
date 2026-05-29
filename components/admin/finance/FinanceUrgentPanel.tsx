import Link from "next/link";
import { Card } from "@/components/ui";
import type { FinanceUrgentItem, FinanceUrgencyLevel } from "@/types/finance";

const LEVEL_STYLES: Record<FinanceUrgencyLevel, string> = {
  normal: "border-emerald-400/20 bg-emerald-400/5 text-emerald-100",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  danger: "border-rose-400/25 bg-rose-400/10 text-rose-100"
};

const LEVEL_LABEL: Record<FinanceUrgencyLevel, string> = {
  normal: "Bình thường",
  warning: "Cảnh báo",
  danger: "Nguy hiểm"
};

type FinanceUrgentPanelProps = {
  items: FinanceUrgentItem[];
  allClear: boolean;
};

export function FinanceUrgentPanel({ items, allClear }: FinanceUrgentPanelProps) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-white">Việc cần xử lý</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Ưu tiên các hạng mục cần admin xử lý ngay trong hệ thống tài chính.
        </p>
      </div>

      {allClear ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-100">
          Hệ thống tài chính hiện không có việc khẩn cấp.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${LEVEL_STYLES[item.level]}`}
            key={item.id}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-0.5 text-xs opacity-90">{item.statusText}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide opacity-70">
                {LEVEL_LABEL[item.level]}
              </p>
            </div>
            <Link
              className="shrink-0 rounded-lg border border-white/15 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/40"
              href={item.href}
            >
              Xử lý
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
