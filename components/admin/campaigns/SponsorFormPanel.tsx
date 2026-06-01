"use client";

import { useActionState, useEffect } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import {
  createSponsorAction,
  INITIAL_CAMPAIGN_ACTION_STATE,
  updateSponsorAction
} from "@/lib/admin/campaign-actions";
import { SPONSOR_STATUS_LABELS } from "@/lib/campaigns/constants";
import type { CampaignStaffPermissions, SponsorRecord, SponsorWithStats } from "@/types/campaign";

type SponsorFormPanelProps = {
  open: boolean;
  sponsor?: SponsorRecord | SponsorWithStats | null;
  permissions: CampaignStaffPermissions;
  onClose: () => void;
};

export function SponsorFormPanel({
  open,
  sponsor,
  permissions,
  onClose
}: SponsorFormPanelProps) {
  const isEdit = Boolean(sponsor);
  const action = isEdit ? updateSponsorAction : createSponsorAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_CAMPAIGN_ACTION_STATE);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  if (!open) return null;

  const canSubmit = permissions.canManageSponsors;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button aria-label="Đóng" className="absolute inset-0 bg-black/60" onClick={onClose} type="button" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1016] p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">
          {isEdit ? "Sửa sponsor" : "Tạo sponsor"}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">Đối tác thương hiệu tài trợ campaign.</p>

        <form action={formAction} className="mt-4 space-y-3">
          {isEdit && sponsor ? <input name="sponsorId" type="hidden" value={sponsor.id} /> : null}

          <Input defaultValue={sponsor?.name ?? ""} label="Tên sponsor *" name="name" required />
          <Input
            defaultValue={sponsor?.contactEmail ?? ""}
            label="Email liên hệ"
            name="contactEmail"
            type="email"
          />
          <Input defaultValue={sponsor?.websiteUrl ?? ""} label="Website URL" name="websiteUrl" />
          <Input defaultValue={sponsor?.logoUrl ?? ""} label="Logo URL" name="logoUrl" />

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-300">Trạng thái</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
              defaultValue={sponsor?.status ?? "active"}
              name="status"
            >
              {Object.entries(SPONSOR_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <Textarea defaultValue={sponsor?.notes ?? ""} label="Ghi chú" name="notes" />

          {state.message ? (
            <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
              {state.message}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button disabled={!canSubmit} loading={pending} type="submit">
              {isEdit ? "Lưu sponsor" : "Tạo sponsor"}
            </Button>
            <Button onClick={onClose} type="button" variant="secondary">
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
