import { Button } from "@/components/ui";

type TaxonomyAnalyticsHeaderProps = {
  canExport: boolean;
  canRebuild: boolean;
  canManageAlgorithm: boolean;
  pending: boolean;
  message: string | null;
  onRebuild: () => void;
  onExportCsv: () => void;
  onOpenLogs: () => void;
};

export function TaxonomyAnalyticsHeader({
  canExport,
  canRebuild,
  canManageAlgorithm,
  pending,
  message,
  onRebuild,
  onExportCsv,
  onOpenLogs
}: TaxonomyAnalyticsHeaderProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Taxonomy Intelligence Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canRebuild || pending} onClick={onRebuild} variant="secondary">
            {pending ? "Đang xử lý..." : "Làm mới dữ liệu"}
          </Button>
          <Button disabled={!canExport} onClick={onExportCsv} variant="secondary">
            Xuất báo cáo
          </Button>
          <Button onClick={onOpenLogs} variant="ghost">
            Xem nhật ký aggregate
          </Button>
          <Button disabled={!canManageAlgorithm} variant="ghost">
            Cấu hình ngưỡng cảnh báo
          </Button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
    </section>
  );
}
