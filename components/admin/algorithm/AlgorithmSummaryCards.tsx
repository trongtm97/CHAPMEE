import { Card } from "@/components/ui";
import type { AlgorithmControlCenterData } from "@/types/algorithm-settings";

type AlgorithmSummaryCardsProps = {
  data: Pick<
    AlgorithmControlCenterData,
    | "version"
    | "activeCount"
    | "totalCount"
    | "lastUpdatedAt"
    | "configWarnings"
    | "exposureConcentration"
  >;
};

export function AlgorithmSummaryCards({ data }: AlgorithmSummaryCardsProps) {
  const warningCount = data.configWarnings.length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Version hiện tại
        </p>
        <p className="text-2xl font-black text-white">{data.version}</p>
      </Card>
      <Card className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Settings active
        </p>
        <p className="text-2xl font-black text-cyan-200">
          {data.activeCount}
          <span className="text-base font-semibold text-zinc-500"> / {data.totalCount}</span>
        </p>
      </Card>
      <Card className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Cập nhật gần nhất
        </p>
        <p className="text-sm font-semibold text-zinc-100">
          {data.lastUpdatedAt
            ? new Date(data.lastUpdatedAt).toLocaleString("vi-VN")
            : "Chưa có"}
        </p>
      </Card>
      <Card className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Cảnh báo cấu hình
        </p>
        <p
          className={`text-2xl font-black ${warningCount > 0 ? "text-amber-300" : "text-emerald-300"}`}
        >
          {warningCount}
        </p>
      </Card>
      <Card className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Exposure concentration (7d)
        </p>
        {data.exposureConcentration?.topAuthorSharePercent != null ? (
          <p className="text-sm leading-6 text-zinc-200">
            Top author:{" "}
            <span className="font-bold text-white">
              {data.exposureConcentration.topAuthorSharePercent}%
            </span>
            <br />
            Top story:{" "}
            <span className="font-bold text-white">
              {data.exposureConcentration.topStorySharePercent}%
            </span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Chưa có dữ liệu exposure</p>
        )}
      </Card>
    </div>
  );
}
