"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CAMPAIGN_TYPE_OPTIONS,
  CampaignStatusBadge,
  CampaignTypeBadge,
  formatCampaignDate
} from "@/components/admin/notification-campaigns/CampaignBadges";
import { CampaignPreviewModal } from "@/components/admin/notification-campaigns/CampaignPreviewModal";
import { CampaignUserPicker } from "@/components/admin/notification-campaigns/CampaignUserPicker";
import {
  estimateNotificationCampaignAction,
  saveAdminNotificationCampaignAction,
  sendAdminNotificationCampaignAction,
  testSendNotificationCampaignAction
} from "@/lib/admin/notification-campaign-actions";
import { validateCampaignInternalHref } from "@/lib/platform-content/campaign-href";
import { campaignTargetsAllUsers } from "@/lib/platform-content/parse-notification-campaign-filters";
import type { AdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";
import {
  NOTIFICATION_CAMPAIGN_SEGMENT_LABELS,
  NOTIFICATION_CAMPAIGN_SEGMENTS
} from "@/types/admin-notification-campaigns";
import type {
  CampaignNotificationType,
  CampaignStatus,
  CampaignTargetMode,
  NotificationCampaign
} from "@/types/platform-content";

type Props = {
  mode: "create" | "edit";
  campaign?: NotificationCampaign | null;
  capabilities: AdminNotificationCampaignCapabilities;
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60";

function toLocalInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CampaignForm({ mode, campaign, capabilities }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [message, setMessage] = useState(campaign?.message ?? "");
  const [notificationType, setNotificationType] = useState<CampaignNotificationType>(
    campaign?.notification_type ?? "system"
  );
  const [href, setHref] = useState(campaign?.href ?? "");
  const [hrefError, setHrefError] = useState<string | null>(null);
  const [channelInApp, setChannelInApp] = useState(campaign?.channel_in_app ?? true);
  const [channelBanner, setChannelBanner] = useState(campaign?.channel_banner ?? false);
  const [channelPopup, setChannelPopup] = useState(campaign?.channel_popup ?? false);
  const [targetMode, setTargetMode] = useState<CampaignTargetMode>(
    campaign?.target_mode ?? "segment"
  );
  const [targetSegments, setTargetSegments] = useState<string[]>(
    campaign?.target_segments ?? []
  );
  const [manualUserIds, setManualUserIds] = useState<string[]>(
    campaign?.manual_user_ids ?? []
  );
  const [manualUsers, setManualUsers] = useState<
    import("@/types/admin-notification-campaigns").CampaignUserSearchResult[]
  >([]);
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? "draft");
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(campaign?.scheduled_at));
  const [estimate, setEstimate] = useState(campaign?.estimated_recipient_count ?? 0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmAllUsers, setConfirmAllUsers] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState(false);
  const [allUsersConfirmPhrase, setAllUsersConfirmPhrase] = useState("");
  const [campaignName, setCampaignName] = useState(campaign?.name ?? campaign?.title ?? "");

  const isLocked = campaign?.status === "sent" || campaign?.status === "sending";
  const canSave = mode === "create" ? capabilities.canCreate : capabilities.canUpdate;
  const canSend = capabilities.canSend && !isLocked && campaign?.id;

  const estimateInput = useMemo(
    () => ({
      target_mode: targetMode,
      target_segments: targetSegments,
      manual_user_ids: manualUserIds
    }),
    [targetMode, targetSegments, manualUserIds]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const result = await estimateNotificationCampaignAction(estimateInput);
        if (!result.error) {
          setEstimate(result.count);
        }
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [estimateInput]);

  function toggleSegment(segment: string) {
    setTargetSegments((prev) =>
      prev.includes(segment) ? prev.filter((item) => item !== segment) : [...prev, segment]
    );
  }

  function handleHrefChange(value: string) {
    setHref(value);
    setHrefError(validateCampaignInternalHref(value));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validation = validateCampaignInternalHref(href);
    if (validation) {
      setHrefError(validation);
      return;
    }

    startTransition(async () => {
      const result = await saveAdminNotificationCampaignAction({
        id: campaign?.id,
        name: campaignName,
        title,
        message,
        notification_type: notificationType,
        href: href.trim() || undefined,
        channel_in_app: channelInApp,
        channel_email: false,
        channel_banner: channelBanner,
        channel_popup: channelPopup,
        target_mode: targetMode,
        target_segments: targetSegments,
        manual_user_ids: manualUserIds,
        status,
        scheduled_at: scheduledAt
      });

      setToast(result.message);
      if (!result.ok) {
        return;
      }

      if (mode === "create" && result.id) {
        router.push(`/admin/notifications/${result.id}`);
        router.refresh();
        return;
      }

      router.refresh();
    });
  }

  function openPreview() {
    setConfirmAllUsers(false);
    setConfirmPopup(false);
    setPreviewOpen(true);
  }

  function handleSend() {
    if (!campaign?.id) {
      return;
    }

    startTransition(async () => {
      const result = await sendAdminNotificationCampaignAction({
        campaignId: campaign.id,
        confirmAllUsers,
        confirmPopup,
        allUsersConfirmPhrase
      });

      setToast(result.message);
      if (!result.ok) {
        return;
      }

      setPreviewOpen(false);
      router.refresh();
    });
  }

  function handleTestSend() {
    if (!campaign?.id) return;
    startTransition(async () => {
      const result = await testSendNotificationCampaignAction({ campaignId: campaign.id });
      setToast(result.message);
    });
  }

  const targetsAll = campaignTargetsAllUsers({
    target_mode: targetMode,
    target_segments: targetSegments
  });

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {toast ? (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
              {toast}
            </div>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Nội dung</h2>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Tên campaign (nội bộ)</span>
              <input
                className={inputClassName}
                disabled={isLocked}
                onChange={(event) => setCampaignName(event.target.value)}
                required
                value={campaignName}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Tiêu đề thông báo</span>
              <input
                className={inputClassName}
                disabled={isLocked}
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Nội dung thông báo</span>
              <textarea
                className={`${inputClassName} min-h-[160px]`}
                disabled={isLocked}
                onChange={(event) => setMessage(event.target.value)}
                required
                value={message}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Loại thông báo</span>
              <select
                className={inputClassName}
                disabled={isLocked}
                onChange={(event) =>
                  setNotificationType(event.target.value as CampaignNotificationType)
                }
                value={notificationType}
              >
                {CAMPAIGN_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Link nội bộ (href)</span>
              <input
                className={inputClassName}
                disabled={isLocked}
                onChange={(event) => handleHrefChange(event.target.value)}
                placeholder="/discover"
                value={href}
              />
              {hrefError ? <p className="text-xs text-red-300">{hrefError}</p> : null}
              <p className="text-xs text-zinc-500">Chỉ cho phép đường dẫn nội bộ bắt đầu bằng /.</p>
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Kênh</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  checked={channelInApp}
                  disabled={isLocked}
                  onChange={(event) => setChannelInApp(event.target.checked)}
                  type="checkbox"
                />
                In-app
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input checked={false} disabled type="checkbox" />
                Email (chưa có provider)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  checked={channelBanner}
                  disabled={isLocked}
                  onChange={(event) => setChannelBanner(event.target.checked)}
                  type="checkbox"
                />
                Banner
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  checked={channelPopup}
                  disabled={isLocked}
                  onChange={(event) => setChannelPopup(event.target.checked)}
                  type="checkbox"
                />
                Popup
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Đối tượng nhận</h2>

            <div className="flex flex-wrap gap-2">
              {(["segment", "manual", "all"] as CampaignTargetMode[]).map((modeValue) => (
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    targetMode === modeValue
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 text-zinc-400 hover:border-white/20"
                  }`}
                  disabled={isLocked}
                  key={modeValue}
                  onClick={() => setTargetMode(modeValue)}
                  type="button"
                >
                  {modeValue === "all"
                    ? "Tất cả người dùng"
                    : modeValue === "manual"
                      ? "Chọn thủ công"
                      : "Segment"}
                </button>
              ))}
            </div>

            {targetMode === "segment" ? (
              <div className="flex flex-wrap gap-2">
                {NOTIFICATION_CAMPAIGN_SEGMENTS.map((segment) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      targetSegments.includes(segment)
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 text-zinc-400 hover:border-white/20"
                    }`}
                    disabled={isLocked}
                    key={segment}
                    onClick={() => toggleSegment(segment)}
                    type="button"
                  >
                    {NOTIFICATION_CAMPAIGN_SEGMENT_LABELS[segment]}
                  </button>
                ))}
              </div>
            ) : null}

            {targetMode === "manual" ? (
              <CampaignUserPicker
                disabled={isLocked}
                onChange={(ids, users) => {
                  setManualUserIds(ids);
                  setManualUsers(users);
                }}
                selectedIds={manualUserIds}
                selectedUsers={manualUsers}
              />
            ) : null}

            {targetsAll ? (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                Cảnh báo: campaign sẽ nhắm đến toàn bộ người dùng phù hợp.
              </p>
            ) : null}

            <p className="text-sm text-zinc-400">
              Ước tính người nhận:{" "}
              <span className="font-semibold text-cyan-300">{estimate}</span>
            </p>
          </section>

          <section className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Status</span>
              <select
                className={inputClassName}
                disabled={isLocked}
                onChange={(event) => setStatus(event.target.value as CampaignStatus)}
                value={status}
              >
                <option value="draft">Nháp</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="paused">Tạm dừng</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-300">Scheduled at</span>
              <input
                className={inputClassName}
                disabled={isLocked}
                onChange={(event) => setScheduledAt(event.target.value)}
                type="datetime-local"
                value={scheduledAt}
              />
            </label>
          </section>

          <div className="flex flex-wrap gap-2">
            {canSave ? (
              <button
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-50"
                disabled={pending || isLocked}
                type="submit"
              >
                {pending ? "Đang lưu…" : mode === "create" ? "Tạo campaign nháp" : "Lưu thay đổi"}
              </button>
            ) : null}

            {canSend ? (
              <button
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                disabled={pending}
                onClick={handleTestSend}
                type="button"
              >
                Gửi test
              </button>
            ) : null}

            {canSend ? (
              <button
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
                disabled={pending || !channelInApp}
                onClick={openPreview}
                type="button"
              >
                Preview & gửi
              </button>
            ) : null}
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Preview nội dung
            </h2>
            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-zinc-950 p-4">
              <CampaignTypeBadge type={notificationType} />
              <p className="font-semibold text-white">{title || "Tiêu đề campaign"}</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-400">
                {message || "Nội dung thông báo…"}
              </p>
              {href ? <p className="text-xs text-cyan-300">{href}</p> : null}
            </div>
          </section>

          {campaign ? (
            <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <CampaignStatusBadge status={campaign.status} />
              </div>
              <p className="mt-3">Đã gửi: {formatCampaignDate(campaign.sent_at)}</p>
              <p>Cập nhật: {formatCampaignDate(campaign.updated_at)}</p>
            </section>
          ) : null}
        </aside>
      </div>

      <CampaignPreviewModal
        campaign={
          campaign ?? {
            id: "",
            name: campaignName,
            title,
            message,
            notification_type: notificationType,
            priority: "normal",
            visual_style: "default",
            action_type: "none",
            action_target_id: null,
            href: href.trim() || null,
            channel_in_app: channelInApp,
            channel_email: false,
            channel_banner: channelBanner,
            channel_popup: channelPopup,
            target_mode: targetMode,
            target_segments: targetSegments,
            manual_user_ids: manualUserIds,
            status,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
            expires_at: null,
            sent_at: null,
            estimated_recipient_count: estimate,
            created_by: null,
            updated_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived_at: null
          }
        }
        allUsersConfirmPhrase={allUsersConfirmPhrase}
        canSend={Boolean(canSend)}
        confirmAllUsers={confirmAllUsers}
        confirmPopup={confirmPopup}
        estimate={estimate}
        onAllUsersConfirmPhraseChange={setAllUsersConfirmPhrase}
        onClose={() => setPreviewOpen(false)}
        onConfirmAllUsersChange={setConfirmAllUsers}
        onConfirmPopupChange={setConfirmPopup}
        onSend={handleSend}
        open={previewOpen}
        pending={pending}
      />
    </>
  );
}
