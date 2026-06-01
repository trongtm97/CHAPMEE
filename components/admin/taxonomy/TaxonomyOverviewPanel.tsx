"use client";

import {
  TAXONOMY_ANALYTICS_HREF,
  TAXONOMY_IMPORT_EXPORT_HREF
} from "@/lib/taxonomy/admin-tabs";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import { TaxonomyAuditPanel } from "@/components/admin/taxonomy/TaxonomyAuditPanel";
import type {
  TaxonomyAdminDashboardStats,
  TaxonomyAuditLogRow
} from "@/lib/taxonomy/admin-data";
import { TAXONOMY_TYPES } from "@/types/taxonomy";

type TaxonomyOverviewPanelProps = {
  stats: TaxonomyAdminDashboardStats;
  qualityAlerts: number;
  auditLogs: TaxonomyAuditLogRow[];
  auditTotal: number;
  auditError: string | null;
  onOpenTab: (tab: string) => void;
  onOpenManage?: () => void;
  onViewAudit?: () => void;
};

export function TaxonomyOverviewPanel({
  stats,
  qualityAlerts,
  auditLogs,
  auditTotal,
  auditError,
  onOpenTab,
  onOpenManage,
  onViewAudit
}: TaxonomyOverviewPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-4">
          <h2 className="text-sm font-semibold text-white">Hướng dẫn vận hành</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
            <li>Creator không tự tạo tag — chỉ gửi yêu cầu qua Studio.</li>
            <li>Không xóa cứng taxonomy có usage; dùng tắt hoặc gộp.</li>
            <li>Composer format cấu hình tại Studio — taxonomy chỉ cung cấp dữ liệu.</li>
            {qualityAlerts > 0 ? (
              <li className="text-amber-200">
                {qualityAlerts} cảnh báo catalog cần xem xét.
              </li>
            ) : null}
            {stats.activeAgeRatings < 1 ? (
              <li className="text-red-200">Chưa có nhãn độ tuổi active.</li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-cyan-400/15 px-3 py-1.5 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-300/30"
              onClick={() => onOpenManage?.()}
              type="button"
            >
              Quản lý taxonomy
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
              onClick={() => onOpenTab("quality")}
              type="button"
            >
              Chất lượng
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
              onClick={() => onOpenTab("requests")}
              type="button"
            >
              Yêu cầu tag ({stats.pendingRequests})
            </button>
          </div>
        </div>

        <TaxonomyAuditPanel
          error={auditError}
          logs={auditLogs}
          onViewAll={onViewAudit}
          total={auditTotal}
        />
      </div>

      <aside className="space-y-3">
        <a
          className="block rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 transition hover:border-cyan-300/40"
          href={TAXONOMY_IMPORT_EXPORT_HREF}
        >
          <p className="text-sm font-semibold text-white">Import / Export</p>
          <p className="mt-1 text-xs text-zinc-500">CSV/JSON · preview · job history</p>
        </a>
        <a
          className="block rounded-xl border border-white/10 bg-zinc-950/30 p-4 transition hover:border-white/20"
          href={TAXONOMY_ANALYTICS_HREF}
        >
          <p className="text-sm font-semibold text-white">Phân tích taxonomy</p>
          <p className="mt-1 text-xs text-zinc-500">CTR, impressions, revenue theo term</p>
        </a>
        <a
          className="block rounded-xl border border-white/10 bg-zinc-950/30 p-4 transition hover:border-white/20"
          href="/admin/taxonomy/unmapped"
        >
          <p className="text-sm font-semibold text-white">Legacy chưa map</p>
          <p className="mt-1 text-xs text-zinc-500">Giá trị cũ chưa gắn taxonomy</p>
        </a>
        <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">15 nhóm taxonomy</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TAXONOMY_TYPES.map((type) => (
              <span
                className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400"
                key={type}
              >
                {TAXONOMY_TYPE_LABELS[type]}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
