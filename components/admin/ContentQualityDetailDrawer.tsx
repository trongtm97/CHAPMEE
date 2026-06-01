"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { QualityHistoryTimeline } from "@/components/studio/QualityHistoryTimeline";
import { QualityMonetizationImpactBox } from "@/components/admin/QualityMonetizationImpactBox";
import { qualityRiskLabel } from "@/lib/admin/content-quality-labels";
import { qualityReasonLabel, qualityStatusLabel } from "@/lib/content-quality/labels";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { AdminContentQualityQueueItem } from "@/types/admin";

type DetailPayload = NonNullable<
  Awaited<
    ReturnType<
      typeof import("@/lib/admin/get-content-quality-admin-detail").getContentQualityAdminDetail
    >
  >["data"]
>;

type ContentQualityDetailDrawerProps = {
  open: boolean;
  item: AdminContentQualityQueueItem | null;
  payload: DetailPayload | null;
  loading?: boolean;
  canModerate: boolean;
  canRefund?: boolean;
  canManageMonetization?: boolean;
  actionDisabled?: boolean;
  onClose: () => void;
  onRequestChanges: () => void;
  onRestore: () => void;
  onHideTemp: () => void;
  onPermanentHide: () => void;
  onSetFree?: () => void;
  onDisableMonetization?: () => void;
  onRefund?: () => void;
  onSetFreeAndRefund?: () => void;
  onRestorePaid?: () => void;
};

export function ContentQualityDetailDrawer({
  open,
  item,
  payload,
  loading,
  canModerate,
  canRefund = false,
  canManageMonetization = false,
  actionDisabled,
  onClose,
  onRequestChanges,
  onRestore,
  onHideTemp,
  onPermanentHide,
  onSetFree,
  onDisableMonetization,
  onRefund,
  onSetFreeAndRefund,
  onRestorePaid
}: ContentQualityDetailDrawerProps) {
  if (!open) return null;

  const isClosed =
    item?.qualityStatus === "permanently_hidden_low_quality" ||
    item?.qualityStatus === "restored";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c1118] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Chi tiết chất lượng</h2>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Đang tải…</p>
          ) : !item || !payload ? (
            <p className="text-sm text-zinc-500">Không có dữ liệu.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>Truyện</Badge>
                  <Badge variant="warning">{qualityStatusLabel(item.qualityStatus)}</Badge>
                  <Badge variant="danger">{qualityRiskLabel(item.riskLevel)}</Badge>
                  {item.structureType === "standalone" ? (
                    <Badge>Một phần</Badge>
                  ) : (
                    <Badge>Nhiều chương</Badge>
                  )}
                </div>
                <h3 className="mt-2 text-xl font-bold text-white">{payload.story.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {payload.author.displayName} · Lần {payload.story.attemptCount}/{item.maxAttempts}
                </p>
              </div>

              {item.structureWarnings.length > 0 ? (
                <section className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                  <h4 className="text-sm font-medium text-amber-100">Cảnh báo cấu trúc</h4>
                  <p className="mt-1 text-sm text-amber-100/90">
                    {item.structureWarnings.join(" · ")}
                  </p>
                </section>
              ) : null}

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Tín hiệu chất lượng</h4>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>
                    Báo cáo hợp lệ: {payload.signals.snapshot.validReportCount ?? 0}
                  </li>
                  <li>
                    Tỷ lệ bỏ đọc sớm:{" "}
                    {payload.signals.snapshot.earlyDropRate != null
                      ? `${Math.round(payload.signals.snapshot.earlyDropRate * 100)}%`
                      : "—"}
                  </li>
                  <li>
                    Kiếm tiền:{" "}
                    {payload.story.monetizationDisabled ? "Đã tắt" : "Đang bật"}
                  </li>
                </ul>
                {payload.signals.suggestedReasons.length > 0 ? (
                  <p className="mt-2 text-xs text-amber-200">
                    Gợi ý:{" "}
                    {payload.signals.suggestedReasons.map(qualityReasonLabel).join(", ")}
                  </p>
                ) : null}
              </section>

              {payload.story.description ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Mô tả</h4>
                  <p className="mt-1 line-clamp-6 text-sm text-zinc-400">
                    {payload.story.description}
                  </p>
                </section>
              ) : null}

              {payload.monetizationImpact ? (
                <QualityMonetizationImpactBox
                  canManageMonetization={canManageMonetization}
                  canRefund={canRefund}
                  disabled={actionDisabled}
                  impact={payload.monetizationImpact}
                  onDisableMonetization={() => onDisableMonetization?.()}
                  onRefund={() => onRefund?.()}
                  onRestorePaid={() => onRestorePaid?.()}
                  onSetFree={() => onSetFree?.()}
                  onSetFreeAndRefund={() => onSetFreeAndRefund?.()}
                  onViewRefundHistory={() => undefined}
                  refundBatches={payload.refundBatches ?? []}
                />
              ) : null}

              {payload.detail?.history?.length ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Lịch sử xử lý</h4>
                  <QualityHistoryTimeline history={payload.detail.history} />
                </section>
              ) : null}

              {payload.appeal ? (
                <section className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                  <h4 className="text-sm font-medium text-amber-100">Khiếu nại</h4>
                  <p className="mt-1 text-sm text-amber-100/90">
                    {payload.appeal.message as string}
                  </p>
                </section>
              ) : null}

              {item.slug && item.publicCode ? (
                <Link
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  href={getStoryDetailHref({
                    slug: item.slug,
                    public_code: item.publicCode
                  })}
                  target="_blank"
                >
                  Mở trang truyện →
                </Link>
              ) : null}

              <Link
                className="block text-sm text-zinc-500 hover:text-zinc-300"
                href={`/admin/content-quality/${item.storyId}`}
              >
                Mở trang chi tiết đầy đủ →
              </Link>
            </div>
          )}
        </div>

        {canModerate && !isClosed && item ? (
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
            <Button disabled={actionDisabled} onClick={onRequestChanges} type="button">
              Yêu cầu sửa
            </Button>
            <Button disabled={actionDisabled} onClick={onRestore} type="button" variant="secondary">
              Khôi phục
            </Button>
            <Button disabled={actionDisabled} onClick={onHideTemp} type="button" variant="secondary">
              Ẩn tạm
            </Button>
            <Button
              disabled={actionDisabled}
              onClick={onPermanentHide}
              type="button"
              variant="danger"
            >
              Ẩn vĩnh viễn
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
