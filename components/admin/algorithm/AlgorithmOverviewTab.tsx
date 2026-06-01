import Link from "next/link";
import { AlgorithmHealthPanel } from "@/components/admin/algorithm/AlgorithmHealthPanel";
import { AlgorithmKpiGrid } from "@/components/admin/algorithm/AlgorithmKpiGrid";
import { AlgorithmVersionPanel } from "@/components/admin/algorithm/AlgorithmVersionPanel";
import { Card } from "@/components/ui";
import { FairDistributionAdminTools } from "@/components/admin/algorithm/FairDistributionAdminTools";
import type {
  AlgorithmControlCenterData,
  AlgorithmControlTabId
} from "@/types/algorithm-settings";

type AlgorithmOverviewTabProps = {
  data: AlgorithmControlCenterData;
  onNavigate?: (tab: AlgorithmControlTabId) => void;
};

export function AlgorithmOverviewTab({ data, onNavigate }: AlgorithmOverviewTabProps) {
  return (
    <div className="space-y-6">
      <AlgorithmKpiGrid data={data} />

      <AlgorithmHealthPanel
        checks={data.healthChecks}
        onViewDetail={onNavigate}
        status={data.healthStatus}
      />

      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold text-white">Lối tắt vận hành</p>
        <div className="flex flex-wrap gap-2">
          <Shortcut href="/admin/algorithm?tab=simulation" label="Mô phỏng" />
          <Shortcut href="/admin/algorithm?tab=exposure_audit" label="Exposure audit" />
          <Shortcut href="/admin/algorithm?tab=fairness" label="Fairness caps" />
          <Shortcut href="/admin/algorithm?tab=cold_start" label="Cold start" />
          <Shortcut href="/admin/algorithm/cold-start" label="Bảng cold start" />
          <Shortcut href="/admin/algorithm/audit" label="Audit hub" />
        </div>
      </Card>

      <FairDistributionAdminTools />

      {data.configWarnings.length > 0 ? (
        <Card className="space-y-2 border-amber-400/25 bg-amber-400/5 p-4">
          <p className="text-sm font-bold text-amber-100">Cảnh báo hàng đầu</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-50/90">
            {data.configWarnings.slice(0, 6).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-emerald-100">
          Cấu hình trọng số đang trong ngưỡng chấp nhận được.
        </Card>
      )}

      <AlgorithmVersionPanel auditLogs={data.auditLogs} version={data.version} />

      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold text-white">Nhóm trọng số</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.weightValidations.map((group) => (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
              key={group.groupId}
            >
              <p className="font-semibold text-zinc-200">{group.label}</p>
              <p className={group.isValid ? "text-emerald-300" : "text-amber-300"}>
                Σ = {group.sum} (Δ {group.delta >= 0 ? "+" : ""}
                {group.delta})
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-cyan-300/30 hover:text-cyan-100"
      href={href}
    >
      {label}
    </Link>
  );
}
