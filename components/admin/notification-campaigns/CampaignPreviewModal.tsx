"use client";

import {
  CampaignStatusBadge,
  CampaignTargetModeBadge,
  CampaignTypeBadge,
  formatCampaignDate
} from "@/components/admin/notification-campaigns/CampaignBadges";
import { ALL_USERS_CONFIRM_PHRASE } from "@/lib/notification-campaigns/campaign-validation";
import { campaignTargetsAllUsers } from "@/lib/platform-content/parse-notification-campaign-filters";
import {
  NOTIFICATION_CAMPAIGN_SEGMENT_LABELS,
  NOTIFICATION_CAMPAIGN_SEGMENTS
} from "@/types/admin-notification-campaigns";
import type { NotificationCampaign } from "@/types/platform-content";

type Props = {
  open: boolean;
  campaign: NotificationCampaign | null;
  estimate: number;
  confirmAllUsers: boolean;
  confirmPopup: boolean;
  allUsersConfirmPhrase: string;
  onConfirmAllUsersChange: (value: boolean) => void;
  onConfirmPopupChange: (value: boolean) => void;
  onAllUsersConfirmPhraseChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  pending?: boolean;
  canSend?: boolean;
};

function channelLabels(campaign: NotificationCampaign) {
  const channels: string[] = [];
  if (campaign.channel_in_app) channels.push("In-app");
  if (campaign.channel_email) channels.push("Email");
  if (campaign.channel_banner) channels.push("Banner");
  if (campaign.channel_popup) channels.push("Popup");
  return channels.join(", ") || "—";
}

export function CampaignPreviewModal({
  open,
  campaign,
  estimate,
  confirmAllUsers,
  confirmPopup,
  allUsersConfirmPhrase,
  onConfirmAllUsersChange,
  onConfirmPopupChange,
  onAllUsersConfirmPhraseChange,
  onClose,
  onSend,
  pending,
  canSend
}: Props) {
  if (!open || !campaign) {
    return null;
  }

  const targetsAll = campaignTargetsAllUsers({
    target_mode: campaign.target_mode,
    target_segments: campaign.target_segments
  });

  const needsPopupConfirm =
    campaign.channel_popup && campaign.notification_type !== "warning";

  const canConfirmSend =
    canSend &&
    (!targetsAll || (confirmAllUsers && allUsersConfirmPhrase.trim().toUpperCase() === ALL_USERS_CONFIRM_PHRASE)) &&
    (!needsPopupConfirm || confirmPopup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
        role="dialog"
      >
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Preview trước khi gửi</h2>
          <p className="text-sm text-zinc-400">
            Kiểm tra nội dung và đối tượng nhận trước khi gửi in-app notification.
          </p>
        </header>

        <div className="mt-6 space-y-4">
          <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap gap-2">
              <CampaignStatusBadge status={campaign.status} />
              <CampaignTypeBadge type={campaign.notification_type} />
              <CampaignTargetModeBadge mode={campaign.target_mode} />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{campaign.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{campaign.message}</p>
            {campaign.href ? (
              <p className="mt-2 text-xs text-cyan-300">Link: {campaign.href}</p>
            ) : null}
          </section>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Kênh</dt>
              <dd className="text-zinc-200">{channelLabels(campaign)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Ước tính người nhận</dt>
              <dd className="text-lg font-semibold text-cyan-300">{estimate}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Segments</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {campaign.target_mode === "all" ? (
                  <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-xs text-red-100">
                    Tất cả người dùng
                  </span>
                ) : campaign.target_mode === "manual" ? (
                  <span className="text-zinc-300">
                    {campaign.manual_user_ids.length} người được chọn thủ công
                  </span>
                ) : campaign.target_segments.length > 0 ? (
                  campaign.target_segments.map((segment) => (
                    <span
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300"
                      key={segment}
                    >
                      {NOTIFICATION_CAMPAIGN_SEGMENT_LABELS[
                        segment as (typeof NOTIFICATION_CAMPAIGN_SEGMENTS)[number]
                      ] ?? segment}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </dd>
            </div>
            {campaign.scheduled_at ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Lên lịch</dt>
                <dd className="text-zinc-200">{formatCampaignDate(campaign.scheduled_at)}</dd>
              </div>
            ) : null}
          </dl>

          {targetsAll ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm font-medium text-amber-100">
                Cảnh báo: thông báo sẽ gửi đến toàn bộ người dùng phù hợp.
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-amber-50">
                <input
                  checked={confirmAllUsers}
                  className="mt-1"
                  onChange={(event) => onConfirmAllUsersChange(event.target.checked)}
                  type="checkbox"
                />
                <span>Tôi hiểu thông báo này sẽ gửi đến toàn bộ người dùng phù hợp.</span>
              </label>
              <label className="mt-3 block space-y-1 text-sm text-amber-50">
                <span>Nhập <strong>{ALL_USERS_CONFIRM_PHRASE}</strong> để xác nhận gửi toàn hệ thống:</span>
                <input
                  className="w-full rounded-lg border border-amber-400/30 bg-zinc-950 px-3 py-2 text-sm text-white"
                  onChange={(event) => onAllUsersConfirmPhraseChange(event.target.value)}
                  placeholder={ALL_USERS_CONFIRM_PHRASE}
                  value={allUsersConfirmPhrase}
                />
              </label>
            </div>
          ) : null}

          {needsPopupConfirm ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm font-medium text-amber-100">
                Popup yêu cầu loại warning hoặc xác nhận bổ sung từ admin.
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-amber-50">
                <input
                  checked={confirmPopup}
                  className="mt-1"
                  onChange={(event) => onConfirmPopupChange(event.target.checked)}
                  type="checkbox"
                />
                <span>Tôi xác nhận hiển thị popup cho campaign này.</span>
              </label>
            </div>
          ) : null}
        </div>

        <footer className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-50"
            disabled={pending || !canConfirmSend}
            onClick={onSend}
            type="button"
          >
            {pending ? "Đang gửi…" : "Gửi in-app notification"}
          </button>
        </footer>
      </div>
    </div>
  );
}
