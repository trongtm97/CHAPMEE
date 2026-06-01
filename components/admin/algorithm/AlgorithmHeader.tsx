"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { bumpAlgorithmVersionAction } from "@/lib/admin/algorithm-settings-actions";
import type { AlgorithmControlTabId } from "@/types/algorithm-settings";

type AlgorithmHeaderProps = {
  canUpdate: boolean;
  pending?: boolean;
  onNavigate: (tab: AlgorithmControlTabId) => void;
  onRefresh: () => void;
};

export function AlgorithmHeader({
  canUpdate,
  pending,
  onNavigate,
  onRefresh
}: AlgorithmHeaderProps) {
  const [actionPending, startTransition] = useTransition();

  function bumpVersion() {
    const reason = window.prompt("Lý do tạo phiên bản mới (tuỳ chọn):");
    if (reason === null) return;
    startTransition(async () => {
      const result = await bumpAlgorithmVersionAction({
        reason: reason.trim() || null
      });
      window.alert(result.message ?? (result.ok ? "Đã tạo phiên bản." : "Lỗi."));
      if (result.ok) onRefresh();
    });
  }

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
          Hệ thống / Algorithm
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Thuật toán hiển thị
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Quản trị phân phối hiển thị công bằng, chống độc quyền nội dung và theo dõi sức khỏe đề
          xuất.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!canUpdate || pending || actionPending}
          onClick={() => {
            window.alert(
              "Mỗi trường cấu hình lưu riêng khi bạn bấm Lưu trên field. Dùng «Tạo phiên bản mới» sau khi hoàn tất chỉnh sửa."
            );
          }}
          type="button"
          variant="ghost"
        >
          Lưu cấu hình
        </Button>
        <Button
          disabled={!canUpdate || pending || actionPending}
          onClick={bumpVersion}
          type="button"
          variant="ghost"
        >
          Tạo phiên bản mới
        </Button>
        <Button
          disabled={pending}
          onClick={() => onNavigate("simulation")}
          type="button"
          variant="primary"
        >
          Chạy mô phỏng
        </Button>
        <Button
          disabled={pending}
          onClick={() => onNavigate("audit")}
          type="button"
          variant="ghost"
        >
          Xem audit
        </Button>
      </div>
    </header>
  );
}
