"use client";

import { Badge, Button } from "@/components/ui";
import { qualityRiskLabel } from "@/lib/admin/content-quality-labels";
import { qualityReasonLabel, qualityStatusLabel } from "@/lib/content-quality/labels";
import type { AdminContentQualityQueueItem } from "@/types/admin";

type ContentQualityItemCardProps = {
  item: AdminContentQualityQueueItem;
  canModerate: boolean;
  disabled?: boolean;
  onView: () => void;
  onRequestChanges: () => void;
  onRestore: () => void;
  onHideTemp: () => void;
  onPermanentHide: () => void;
};

function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function ContentQualityItemCard({
  item,
  canModerate,
  disabled,
  onView,
  onRequestChanges,
  onRestore,
  onHideTemp,
  onPermanentHide
}: ContentQualityItemCardProps) {
  const isClosed =
    item.qualityStatus === "permanently_hidden_low_quality" ||
    item.qualityStatus === "restored";

  return (
    <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="default">Truyện</Badge>
          <h3 className="truncate text-base font-semibold text-white">{item.title}</h3>
        </div>
        <Badge
          variant={
            item.riskLevel === "critical" || item.riskLevel === "high" ? "danger" : "warning"
          }
        >
          {qualityRiskLabel(item.riskLevel)}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        Tác giả: {item.authorPenName}
        {item.genreName ? ` · ${item.genreName}` : ""}
        {" · Lần "}
        {item.attemptCount}/{item.maxAttempts}
        {" · "}
        {qualityStatusLabel(item.qualityStatus)}
      </p>

      {item.reasonCodes.length > 0 ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
          Lý do: {item.reasonCodes.map(qualityReasonLabel).join(" · ")}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500">
        Kiếm tiền: {item.monetizationDisabled ? "Đã tắt" : "Đang bật"} · Cập nhật{" "}
        {relativeTime(item.warnedAt)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={onView} type="button" variant="secondary">
          Xem chi tiết
        </Button>
        {canModerate && !isClosed ? (
          <>
            <Button disabled={disabled} onClick={onRequestChanges} type="button">
              Yêu cầu sửa
            </Button>
            <Button disabled={disabled} onClick={onRestore} type="button" variant="secondary">
              Khôi phục
            </Button>
            <Button disabled={disabled} onClick={onHideTemp} type="button" variant="secondary">
              Ẩn tạm
            </Button>
            <Button disabled={disabled} onClick={onPermanentHide} type="button" variant="danger">
              Ẩn vĩnh viễn
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
