"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui";
import { MONETIZATION_REJECT_REASONS } from "@/lib/admin/creator-labels";
import {
  approveCreatorMonetizationAction,
  permanentlyDisableCreatorMonetizationAction,
  rejectCreatorMonetizationAction,
  restoreCreatorMonetizationAction,
  suspendCreatorMonetizationAction,
  toggleCreatorPayoutAction,
  updateCreatorRevenueShareAction
} from "@/lib/admin/creator-monetization-actions";
import type { AdminCreatorDetail, CreatorAdminCapabilities } from "@/types/admin-creator";

const initialState = { ok: false, error: null as string | null };

export type CreatorModalType =
  | "approve_monetization"
  | "reject_monetization"
  | "suspend_monetization"
  | "restore_monetization"
  | "permanent_disable"
  | "revenue_share"
  | "toggle_payout"
  | null;

type Props = {
  modal: CreatorModalType;
  detail: AdminCreatorDetail;
  capabilities: CreatorAdminCapabilities;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreatorActionModals({
  modal,
  detail,
  capabilities,
  onClose,
  onSuccess
}: Props) {
  const [approveState, approveAction, approving] = useActionState(
    approveCreatorMonetizationAction,
    initialState
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectCreatorMonetizationAction,
    initialState
  );
  const [suspendState, suspendAction, suspending] = useActionState(
    suspendCreatorMonetizationAction,
    initialState
  );
  const [restoreState, restoreAction, restoring] = useActionState(
    restoreCreatorMonetizationAction,
    initialState
  );
  const [permState, permAction, perming] = useActionState(
    permanentlyDisableCreatorMonetizationAction,
    initialState
  );
  const [shareState, shareAction, sharing] = useActionState(
    updateCreatorRevenueShareAction,
    initialState
  );
  const [payoutState, payoutAction, payouting] = useActionState(
    toggleCreatorPayoutAction,
    initialState
  );

  const lastOk =
    approveState.ok ||
    rejectState.ok ||
    suspendState.ok ||
    restoreState.ok ||
    permState.ok ||
    shareState.ok ||
    payoutState.ok;

  useEffect(() => {
    if (lastOk) {
      onSuccess();
      onClose();
    }
  }, [lastOk, onClose, onSuccess]);

  if (!modal) return null;

  const profileId = detail.monetizationProfileId ?? "";
  const error =
    approveState.error ??
    rejectState.error ??
    suspendState.error ??
    restoreState.error ??
    permState.error ??
    shareState.error ??
    payoutState.error;

  const percents = detail.customRevenueShare ?? detail.defaultRevenueShare;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1016] p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-white">
          {modal === "approve_monetization" && "Duyệt kiếm tiền"}
          {modal === "reject_monetization" && "Từ chối kiếm tiền"}
          {modal === "suspend_monetization" && "Tạm dừng kiếm tiền"}
          {modal === "restore_monetization" && "Khôi phục kiếm tiền"}
          {modal === "permanent_disable" && "Khóa kiếm tiền vĩnh viễn"}
          {modal === "revenue_share" && "Lưu tỷ lệ chia doanh thu riêng"}
          {modal === "toggle_payout" &&
            (detail.payoutEnabled ? "Tắt rút tiền" : "Bật rút tiền")}
        </h3>

        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}

        {modal === "approve_monetization" && capabilities.canManageMonetization ? (
          <form action={approveAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <ul className="space-y-1 text-sm text-zinc-400">
              {detail.eligibility.map((item) => (
                <li key={item.key}>
                  {item.met ? "✓" : "○"} {item.label}
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input name="confirm_checklist" type="checkbox" value="true" />
              Tôi đã kiểm tra điều kiện
            </label>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm text-zinc-200"
              name="internal_note"
              placeholder="Ghi chú nội bộ (tuỳ chọn)"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={approving} type="submit">
                Duyệt kiếm tiền
              </Button>
            </div>
          </form>
        ) : null}

        {modal === "reject_monetization" && capabilities.canManageMonetization ? (
          <form action={rejectAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <select
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="reason_code"
              required
            >
              <option value="">Chọn lý do</option>
              {MONETIZATION_REJECT_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="public_note"
              placeholder="Ghi chú gửi tác giả"
              required
              rows={2}
            />
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="internal_note"
              placeholder="Ghi chú nội bộ"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={rejecting} type="submit" variant="danger">
                Từ chối
              </Button>
            </div>
          </form>
        ) : null}

        {modal === "suspend_monetization" && capabilities.canManageMonetization ? (
          <form action={suspendAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <select
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="duration"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="indefinite">Vô thời hạn</option>
            </select>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="reason"
              placeholder="Lý do"
              required
              rows={2}
            />
            <div className="space-y-1 text-sm text-zinc-400">
              <label className="flex gap-2">
                <input name="lock_paid_chapter" type="checkbox" value="true" /> Khóa paid chapter
              </label>
              <label className="flex gap-2">
                <input name="lock_tip" type="checkbox" value="true" /> Khóa tip
              </label>
              <label className="flex gap-2">
                <input name="lock_fan_club" type="checkbox" value="true" /> Khóa fan club
              </label>
              <label className="flex gap-2">
                <input defaultChecked name="lock_payout" type="checkbox" value="true" /> Khóa payout
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={suspending} type="submit" variant="danger">
                Tạm dừng
              </Button>
            </div>
          </form>
        ) : null}

        {modal === "restore_monetization" && capabilities.canManageMonetization ? (
          <form action={restoreAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="reason"
              placeholder="Lý do khôi phục"
              required
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={restoring} type="submit">
                Khôi phục
              </Button>
            </div>
          </form>
        ) : null}

        {modal === "permanent_disable" && capabilities.canManageMonetization ? (
          <form action={permAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="reason"
              placeholder="Lý do khóa vĩnh viễn"
              required
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={perming} type="submit" variant="danger">
                Khóa vĩnh viễn
              </Button>
            </div>
          </form>
        ) : null}

        {modal === "revenue_share" && capabilities.canManageRevenueShare ? (
          <form action={shareAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <input name="user_id" type="hidden" value={detail.userId} />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input defaultChecked={detail.useCustomRevenueShare} name="use_custom" type="checkbox" value="true" />
              Dùng tỷ lệ riêng
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["paid_chapter_percent", "Paid chapter", percents.paidChapter],
                  ["tip_percent", "Tip", percents.tip],
                  ["fan_club_percent", "Fan club", percents.fanClub],
                  ["vip_pool_percent", "VIP pool", percents.vipPool],
                  ["bonus_pool_percent", "Bonus pool", percents.bonusPool]
                ] as const
              ).map(([name, label, def]) => (
                <label className="text-xs text-zinc-500" key={name}>
                  {label} %
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-2 py-1.5 text-sm text-zinc-200"
                    defaultValue={def}
                    max={100}
                    min={0}
                    name={name}
                    required
                    type="number"
                  />
                  <span className="text-zinc-600">
                    Tác giả nhận X%, ChapMee giữ {100 - def}%
                  </span>
                </label>
              ))}
            </div>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="reason"
              placeholder="Lý do thay đổi (bắt buộc)"
              required
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={sharing} type="submit">
                Lưu tỷ lệ riêng
              </Button>
            </div>
          </form>
        ) : null}

        {modal === "toggle_payout" && capabilities.canManagePayout ? (
          <form action={payoutAction} className="mt-4 space-y-3">
            <input name="profile_id" type="hidden" value={profileId} />
            <input
              name="payout_enabled"
              type="hidden"
              value={detail.payoutEnabled ? "false" : "true"}
            />
            <textarea
              className="w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm"
              name="reason"
              placeholder="Lý do (bắt buộc)"
              required
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Huỷ
              </Button>
              <Button loading={payouting} type="submit" variant={detail.payoutEnabled ? "danger" : "secondary"}>
                {detail.payoutEnabled ? "Tắt payout" : "Bật payout"}
              </Button>
            </div>
          </form>
        ) : null}

        {!capabilities.canManageMonetization &&
        !capabilities.canManageRevenueShare &&
        !capabilities.canManagePayout ? (
          <p className="mt-4 text-sm text-zinc-500">Bạn không có quyền thực hiện thao tác này.</p>
        ) : null}
      </div>
    </div>
  );
}
