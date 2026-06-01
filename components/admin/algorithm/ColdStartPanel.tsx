"use client";

import Link from "next/link";
import { AlgorithmCategoryPanel } from "@/components/admin/algorithm/AlgorithmCategoryPanel";
import { Card } from "@/components/ui";
import type {
  AlgorithmControlCenterData,
  AlgorithmSettingRow,
  AlgorithmWeightValidation
} from "@/types/algorithm-settings";

type ColdStartPanelProps = {
  data: Pick<AlgorithmControlCenterData, "coldStartSummary">;
  settings: AlgorithmSettingRow[];
  weightValidations: AlgorithmWeightValidation[];
  canUpdate: boolean;
  onRefresh: () => void;
};

export function ColdStartPanel({
  data,
  settings,
  weightValidations,
  canUpdate,
  onRefresh
}: ColdStartPanelProps) {
  const summary = data.coldStartSummary;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-bold text-white">Cold start</p>
          <p className="text-sm text-zinc-400">
            Quota thử nghiệm cho truyện, Reels và tác giả mới. Boost có decay và điều kiện loại.
          </p>
        </div>
        <Link
          className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20"
          href="/admin/algorithm/cold-start"
        >
          Bảng nội dung cold start
        </Link>
      </Card>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Đang chạy" value={String(summary.activeCount)} />
          <Stat label="Qualified" value={String(summary.qualifiedCount)} />
          <Stat label="Failed" value={String(summary.failedCount)} />
        </div>
      ) : (
        <Card className="p-4 text-sm text-zinc-500">
          Chưa tải được thống kê cold start — xem tab cấu hình bên dưới.
        </Card>
      )}

      <AlgorithmCategoryPanel
        canUpdate={canUpdate}
        categories={["cold_start"]}
        onRefresh={onRefresh}
        settings={settings}
        weightValidations={weightValidations}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </Card>
  );
}
