"use client";

import { useActionState } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  INITIAL_CAMPAIGN_ACTION_STATE,
  saveCampaignSettingsAction
} from "@/lib/admin/campaign-actions";
import type { CampaignCenterSettings, CampaignStaffPermissions } from "@/types/campaign";

type SettingsTabProps = {
  settings: CampaignCenterSettings;
  permissions: CampaignStaffPermissions;
};

function ToggleRow({
  name,
  label,
  description,
  defaultChecked,
  disabled
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <input
        className="mt-1"
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-zinc-500">{description}</span>
      </span>
    </label>
  );
}

export function SettingsTab({ settings, permissions }: SettingsTabProps) {
  const [state, formAction, pending] = useActionState(
    saveCampaignSettingsAction,
    INITIAL_CAMPAIGN_ACTION_STATE
  );

  const disabled = !permissions.canUpdateSettings;

  return (
    <div className="space-y-4">
      <Card className="space-y-2 border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
        <p>Cấu hình frequency và giới hạn placement được lưu vào bảng campaign_settings.</p>
        <p>Enforcement runtime đầy đủ sẽ được bổ sung ở consumer app — hiện UI + lưu cấu hình.</p>
      </Card>

      <form action={formAction} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            defaultChecked={settings.campaignsPublicEnabled}
            description="Tắt sẽ ẩn toàn bộ campaign public."
            disabled={disabled}
            label="Bật campaign public"
            name="campaignsPublicEnabled"
          />
          <ToggleRow
            defaultChecked={settings.sponsoredChallengeEnabled}
            description="Cho phép hiển thị sponsored challenge."
            disabled={disabled}
            label="Sponsored challenge"
            name="sponsoredChallengeEnabled"
          />
          <ToggleRow
            defaultChecked={settings.nativeCardEnabled}
            description="Cho phép native card trong Reels."
            disabled={disabled}
            label="Native card"
            name="nativeCardEnabled"
          />
          <ToggleRow
            defaultChecked={settings.bannerEnabled}
            description="Cho phép banner Discover/Community."
            disabled={disabled}
            label="Banner"
            name="bannerEnabled"
          />
          <ToggleRow
            defaultChecked={settings.disclosureRequired}
            description="Bắt buộc disclosure trước khi active."
            disabled={disabled}
            label="Yêu cầu disclosure"
            name="disclosureRequired"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            defaultValue={String(settings.maxActivePerPlacement)}
            disabled={disabled}
            label="Giới hạn active / placement"
            min={1}
            name="maxActivePerPlacement"
            type="number"
          />
          <Input
            defaultValue={String(settings.reelsNativeFrequency)}
            disabled={disabled}
            label="Reels: mỗi N item 1 card"
            min={1}
            name="reelsNativeFrequency"
            type="number"
          />
          <Input
            defaultValue={String(settings.discoverBannerMax)}
            disabled={disabled}
            label="Discover: tối đa banner"
            min={0}
            name="discoverBannerMax"
            type="number"
          />
          <Input
            defaultValue={String(settings.communityFeedMax)}
            disabled={disabled}
            label="Community: tối đa sponsored card"
            min={0}
            name="communityFeedMax"
            type="number"
          />
        </div>

        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
            {state.message}
          </p>
        ) : null}

        {permissions.canUpdateSettings ? (
          <Button loading={pending} type="submit">
            Lưu cấu hình
          </Button>
        ) : (
          <p className="text-sm text-zinc-500">Bạn không có quyền cập nhật cấu hình.</p>
        )}
      </form>
    </div>
  );
}
