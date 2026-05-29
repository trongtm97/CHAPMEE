import { Card } from "@/components/ui";
import type { FinanceCreatorRow } from "@/types/finance";

type CreatorRevenueTableProps = {
  rows: FinanceCreatorRow[];
};

export function CreatorRevenueTable({ rows }: CreatorRevenueTableProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-base font-black text-white">Top Earning Authors</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Chưa có dữ liệu creator revenue.</p>
      ) : (
        rows.map((row) => (
          <div
            className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
            key={row.creatorUserId}
          >
            <span className="text-zinc-300">{row.creatorName}</span>
            <span className="text-zinc-100">{row.netRevenueVnd.toLocaleString("vi-VN")} đ</span>
          </div>
        ))
      )}
    </Card>
  );
}
