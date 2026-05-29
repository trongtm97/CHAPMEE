import { Card } from "@/components/ui";
import { revenueSourceLabel } from "@/lib/finance/finance-labels";
import type { RevenueBreakdownItem } from "@/types/finance";

type RevenueBreakdownTableProps = {
  items: RevenueBreakdownItem[];
  isEmpty: boolean;
};

export function RevenueBreakdownTable({ items, isEmpty }: RevenueBreakdownTableProps) {
  const nonZero = items.filter((item) => item.amountVnd > 0);

  return (
    <Card className="space-y-3">
      <h3 className="text-base font-black text-white">Cơ cấu doanh thu</h3>
      {isEmpty && nonZero.length === 0 ? (
        <p className="text-sm text-zinc-400">Chưa có doanh thu trong kỳ này.</p>
      ) : nonZero.length === 0 ? (
        <p className="text-sm text-zinc-400">Chưa có doanh thu trong kỳ này.</p>
      ) : (
        <div className="space-y-2">
          {nonZero.map((item) => (
            <div
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
              key={item.source}
            >
              <span className="text-zinc-300">{revenueSourceLabel(item.source)}</span>
              <span className="text-zinc-100">
                {item.amountVnd.toLocaleString("vi-VN")} đ ({item.ratio}%)
                {item.transactionCount > 0 ? ` · ${item.transactionCount} GD` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
