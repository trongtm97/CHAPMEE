import { SimpleBarChart } from "@/components/studio/analytics/dashboard/SimpleBarChart";
import { analyticsCard } from "@/components/studio/analytics/dashboard/shared/styles";
import type {
  StudioAnalyticsSourceBreakdown,
  StudioAnalyticsTimelinePoint,
  StudioEngagementTimelinePoint
} from "@/types/studio-analytics";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

type AnalyticsChartsSectionProps = {
  engagementTimeline: StudioEngagementTimelinePoint[];
  readTimeline: StudioAnalyticsTimelinePoint[];
  sourceBreakdown: StudioAnalyticsSourceBreakdown;
};

export function AnalyticsChartsSection({
  engagementTimeline,
  readTimeline,
  sourceBreakdown
}: AnalyticsChartsSectionProps) {
  const engagementMax = Math.max(
    ...engagementTimeline.map((p) => p.saves + p.comments + p.follows),
    1
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={`${analyticsCard} p-4`}>
        <h2 className="text-sm font-bold text-white">Lượt đọc theo thời gian</h2>
        <p className="mt-1 text-xs text-zinc-500">Theo ngày trong kỳ đã chọn</p>
        <div className="mt-4">
          <SimpleBarChart
            emptyMessage="Chưa có đủ dữ liệu lượt đọc."
            points={readTimeline.map((p) => ({ label: p.label, value: p.value }))}
          />
        </div>
      </section>

      <section className={`${analyticsCard} p-4`}>
        <h2 className="text-sm font-bold text-white">Tương tác theo thời gian</h2>
        <p className="mt-1 text-xs text-zinc-500">Lưu, bình luận, theo dõi mới</p>
        <div className="mt-4">
          {engagementTimeline.some(
            (p) => p.saves + p.comments + p.follows > 0
          ) ? (
            <div className="overflow-x-auto">
              <div className="flex min-w-[280px] items-end gap-1.5">
                {engagementTimeline.map((point) => {
                  const total = point.saves + point.comments + point.follows;

                  return (
                    <div
                      className="flex min-w-[2rem] flex-1 flex-col items-center gap-1"
                      key={point.date}
                      title={`${point.label}: ${total} tương tác`}
                    >
                      <div className="flex h-24 w-full items-end justify-center gap-0.5">
                        <div
                          className="w-1/3 rounded-t bg-violet-400/80"
                          style={{
                            height: `${(point.saves / engagementMax) * 100}%`,
                            minHeight: point.saves > 0 ? 4 : 0
                          }}
                        />
                        <div
                          className="w-1/3 rounded-t bg-cyan-400/80"
                          style={{
                            height: `${(point.comments / engagementMax) * 100}%`,
                            minHeight: point.comments > 0 ? 4 : 0
                          }}
                        />
                        <div
                          className="w-1/3 rounded-t bg-emerald-400/80"
                          style={{
                            height: `${(point.follows / engagementMax) * 100}%`,
                            minHeight: point.follows > 0 ? 4 : 0
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">{point.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-violet-400" /> Lưu
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-cyan-400" /> Bình luận
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-emerald-400" /> Theo dõi
                </span>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-500">
              Chưa có đủ dữ liệu tương tác.
            </p>
          )}
        </div>
      </section>

      <section className={`${analyticsCard} p-4 lg:col-span-2`}>
        <h2 className="text-sm font-bold text-white">Nguồn tăng trưởng</h2>
        <p className="mt-1 text-xs text-zinc-500">Phân bổ tín hiệu trong kỳ</p>
        {sourceBreakdown.hasTracking ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Truyện", value: sourceBreakdown.story },
              { label: "Chương", value: sourceBreakdown.chapter },
              { label: "Reels", value: sourceBreakdown.reels },
              { label: "Bình luận", value: sourceBreakdown.community }
            ].map((item) => (
              <div
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3"
                key={item.label}
              >
                <p className="text-lg font-bold text-white">
                  {formatNumber(item.value)}
                </p>
                <p className="text-xs text-zinc-500">{item.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-zinc-500">
            Nguồn dữ liệu sẽ xuất hiện khi có tracking lượt đọc và tương tác.
          </p>
        )}
      </section>
    </div>
  );
}
