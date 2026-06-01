import type { CampaignNotificationType, CampaignStatus, CampaignTargetMode } from "@/types/platform-content";
import { CAMPAIGN_NOTIFICATION_TYPES } from "@/types/platform-content";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  sending: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  sent: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  paused: "border-orange-400/30 bg-orange-400/10 text-orange-100",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-100",
  failed: "border-red-400/40 bg-red-500/15 text-red-100",
  archived: "border-zinc-600/30 bg-zinc-800/50 text-zinc-400"
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  sending: "Đang gửi",
  sent: "Đã gửi",
  paused: "Tạm dừng",
  cancelled: "Đã hủy",
  failed: "Lỗi",
  archived: "Lưu trữ"
};

const TYPE_LABELS: Record<CampaignNotificationType, string> = {
  system: "Hệ thống",
  policy: "Chính sách",
  monetization: "Kiếm tiền",
  account: "Tài khoản",
  story: "Truyện",
  chapter: "Chương",
  event: "Sự kiện",
  warning: "Cảnh báo",
  marketing: "Khuyến mãi"
};

const TARGET_MODE_LABELS: Record<CampaignTargetMode, string> = {
  all: "Tất cả người dùng",
  segment: "Theo nhóm",
  manual: "Chọn thủ công"
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CampaignTypeBadge({ type }: { type: CampaignNotificationType }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-300">
      {TYPE_LABELS[type]}
    </span>
  );
}

export function CampaignTargetModeBadge({ mode }: { mode: CampaignTargetMode }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      {TARGET_MODE_LABELS[mode]}
    </span>
  );
}

export function formatCampaignDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export const CAMPAIGN_TYPE_OPTIONS = CAMPAIGN_NOTIFICATION_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value]
}));

export { TYPE_LABELS as CAMPAIGN_NOTIFICATION_TYPE_LABELS };
