"use client";

import { Button, Card } from "@/components/ui";

type Props = {
  onReset: () => void;
  onViewAll: () => void;
};

export function TransactionEmptyState({ onReset, onViewAll }: Props) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="text-lg font-bold text-white">Chưa có giao dịch phù hợp</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
        Thử đổi bộ lọc, khoảng thời gian hoặc tìm bằng mã giao dịch/user khác.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={onReset} type="button" variant="ghost">
          Xóa bộ lọc
        </Button>
        <Button onClick={onViewAll} type="button">
          Xem tất cả giao dịch
        </Button>
      </div>
    </Card>
  );
}
