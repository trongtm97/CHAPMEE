import Link from "next/link";
import { FinanceBadge } from "@/components/studio/finance/finance-ui";
import type { FinanceWithdrawalChecklistItem } from "@/types/finance";

type FinanceWithdrawalChecklistProps = {
  items: FinanceWithdrawalChecklistItem[];
  onAction?: (action: "add-bank" | "setup-pin") => void;
};

export function FinanceWithdrawalChecklist({ items, onAction }: FinanceWithdrawalChecklistProps) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
          key={item.id}
        >
          <div className="flex items-center gap-2">
            <FinanceBadge tone={item.met ? "green" : "amber"}>{item.met ? "Đạt" : "Thiếu"}</FinanceBadge>
            <span className="text-sm text-zinc-300">{item.label}</span>
          </div>
          {!item.met && item.ctaHref ? (
            <Link
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              href={item.ctaHref}
            >
              {item.ctaLabel}
            </Link>
          ) : null}
          {!item.met && item.ctaAction ? (
            <button
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              onClick={() => onAction?.(item.ctaAction!)}
              type="button"
            >
              {item.ctaLabel}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
