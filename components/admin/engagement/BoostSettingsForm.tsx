"use client";

import { useActionState } from "react";
import {
  grantRewardPointsAction,
  updateBoostSettingsAction
} from "@/lib/admin/boost-settings-actions";
import type { BoostSettings } from "@/types/story-boost";

type BoostSettingsFormProps = {
  settings: BoostSettings;
};

export function BoostSettingsForm({ settings }: BoostSettingsFormProps) {
  const [state, action, pending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) => {
      return updateBoostSettingsAction(formData);
    },
    null
  );

  const [grantState, grantAction, grantPending] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, formData: FormData) => {
      return grantRewardPointsAction(formData);
    },
    null
  );

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Cấu hình đề cử</h2>
        <div className="flex flex-wrap gap-4">
          <CheckboxField defaultChecked={settings.enabled} label="Bật tính năng đề cử" name="enabled" />
          <CheckboxField
            defaultChecked={settings.rewardPointBoostEnabled}
            label="Đề cử bằng điểm thưởng"
            name="rewardPointBoostEnabled"
          />
          <CheckboxField
            defaultChecked={settings.coinBoostEnabled}
            label="Cho phép xu (chưa triển khai thanh toán)"
            name="coinBoostEnabled"
          />
          <CheckboxField
            defaultChecked={settings.allowCreatorSelfBoost}
            label="Tác giả tự đề cử"
            name="allowCreatorSelfBoost"
          />
          <CheckboxField
            defaultChecked={settings.showPublicMessages}
            label="Hiện lời nhắn công khai"
            name="showPublicMessages"
          />
          <CheckboxField
            defaultChecked={settings.antiWhaleCapEnabled}
            label="Giảm hiệu lực boost lặp (anti-whale)"
            name="antiWhaleCapEnabled"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField defaultValue={settings.minBoostPoints} label="Điểm tối thiểu / lần" name="minBoostPoints" />
          <NumberField defaultValue={settings.pointsPerUnit} label="Điểm tiêu / lần" name="pointsPerUnit" />
          <NumberField
            defaultValue={settings.boostPointsPerUnit}
            label="Boost points / lần"
            name="boostPointsPerUnit"
          />
          <NumberField defaultValue={settings.userDailyCap} label="Cap user / ngày" name="userDailyCap" />
          <NumberField defaultValue={settings.storyDailyCap} label="Cap truyện / ngày" name="storyDailyCap" />
          <NumberField
            defaultValue={settings.minStoryAgeHours}
            label="Tuổi truyện tối thiểu (giờ)"
            name="minStoryAgeHours"
          />
          <NumberField
            defaultValue={settings.decayHalfLifeDays}
            label="Half-life decay (ngày)"
            name="decayHalfLifeDays"
          />
          <NumberField
            defaultValue={settings.rankingWeight}
            label="Trọng số bảng đề cử"
            name="rankingWeight"
            step="0.1"
          />
          <NumberField
            defaultValue={settings.organicBlendMax}
            label="Organic blend max (0 = tắt)"
            name="organicBlendMax"
            step="0.01"
          />
        </div>
        <button
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
        {state?.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>{state.message}</p>
        ) : null}
      </form>

      <form action={grantAction} className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Cấp điểm thưởng (legacy)</h2>
        <p className="text-sm text-zinc-500">
          Hệ thống cũ (reward_points). Cấp{" "}
          <a className="font-semibold text-amber-300 hover:underline" href="/admin/engagement/recommendation-tickets">
            Phiếu đề cử
          </a>{" "}
          tại trang mới.
        </p>
        <input
          className="w-full rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
          name="userId"
          placeholder="User profile UUID"
          required
        />
        <input
          className="w-full rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
          defaultValue={100}
          min={1}
          name="amount"
          required
          type="number"
        />
        <button
          className="rounded-full border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-60"
          disabled={grantPending}
          type="submit"
        >
          {grantPending ? "Đang cấp…" : "Cấp điểm"}
        </button>
        {grantState?.message ? (
          <p className={`text-sm ${grantState.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {grantState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function CheckboxField({
  defaultChecked,
  label,
  name
}: {
  defaultChecked: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      {label}
    </label>
  );
}

function NumberField({
  defaultValue,
  label,
  name,
  step = "1"
}: {
  defaultValue: number;
  label: string;
  name: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        className="rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
        defaultValue={defaultValue}
        name={name}
        required
        step={step}
        type="number"
      />
    </label>
  );
}
