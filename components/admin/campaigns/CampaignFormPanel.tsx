"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CampaignPreview } from "@/components/admin/campaigns/CampaignPreview";
import { Button, Input, Textarea } from "@/components/ui";
import {
  createCampaignAction,
  INITIAL_CAMPAIGN_ACTION_STATE,
  updateCampaignAction
} from "@/lib/admin/campaign-actions";
import {
  CAMPAIGN_TYPE_DEFINITIONS,
  getDefaultPlacementForType,
  PLACEMENT_DEFINITIONS
} from "@/lib/campaigns/constants";
import type { CampaignFormInput, CampaignStaffPermissions, CampaignWithSponsor, SponsorRecord } from "@/types/campaign";
import type { ChallengeListItem } from "@/lib/supabase/challenges";

type CampaignFormPanelProps = {
  open: boolean;
  campaign?: CampaignWithSponsor | null;
  sponsors: SponsorRecord[];
  challenges: ChallengeListItem[];
  permissions: CampaignStaffPermissions;
  onClose: () => void;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Nháp" },
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "active", label: "Đang chạy" },
  { value: "paused", label: "Tạm dừng" },
  { value: "ended", label: "Đã kết thúc" },
  { value: "archived", label: "Đã lưu trữ" }
];

const TARGET_OPTIONS = [
  { value: "none", label: "Không có" },
  { value: "story", label: "Truyện" },
  { value: "chapter", label: "Chương" },
  { value: "community_challenge", label: "Challenge cộng đồng" },
  { value: "creator_studio", label: "Creator Studio" },
  { value: "external_url", label: "URL ngoài" }
];

function toLocalDatetime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildInitialForm(campaign?: CampaignWithSponsor | null): Partial<CampaignFormInput> {
  if (campaign) {
    return {
      sponsorId: campaign.sponsorId,
      name: campaign.name,
      campaignType: campaign.campaignType,
      placement: campaign.placement,
      status: campaign.status,
      budgetVnd: campaign.budgetVnd,
      revenueVnd: campaign.revenueVnd,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      disclosureText: campaign.disclosureText,
      ctaText: campaign.ctaText,
      ctaUrl: campaign.ctaUrl,
      targetType: campaign.targetType,
      targetId: campaign.targetId,
      description: campaign.description,
      adminNote: campaign.adminNote
    };
  }
  return {
    campaignType: "sponsored_challenge",
    placement: getDefaultPlacementForType("sponsored_challenge"),
    status: "draft",
    disclosureText: "Được tài trợ"
  };
}

function CampaignFormPanelContent({
  campaign,
  sponsors,
  challenges,
  permissions,
  onClose
}: Omit<CampaignFormPanelProps, "open">) {
  const isEdit = Boolean(campaign);
  const action = isEdit ? updateCampaignAction : createCampaignAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_CAMPAIGN_ACTION_STATE);
  const [form, setForm] = useState<Partial<CampaignFormInput>>(() => buildInitialForm(campaign));

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const sponsor = useMemo(
    () => sponsors.find((s) => s.id === form.sponsorId),
    [sponsors, form.sponsorId]
  );

  const availablePlacements = PLACEMENT_DEFINITIONS.filter(
    (p) => p.availability === "available" && p.campaignTypes.includes(form.campaignType ?? "sponsored_challenge")
  );

  const canSubmit = isEdit ? permissions.canUpdate : permissions.canCreate;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end">
      <button aria-label="Đóng" className="absolute inset-0 bg-black/60" onClick={onClose} type="button" />
      <div className="relative flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0b1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isEdit ? "Sửa campaign" : "Tạo campaign"}
            </h3>
            <p className="text-sm text-zinc-400">Điền thông tin và xem preview vị trí hiển thị.</p>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          {isEdit && campaign ? <input name="campaignId" type="hidden" value={campaign.id} /> : null}

          <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-2">
            <div className="space-y-3 border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
              <Input
                defaultValue={form.name ?? ""}
                label="Tên campaign *"
                name="name"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-300">Sponsor *</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  defaultValue={form.sponsorId ?? ""}
                  name="sponsorId"
                  onChange={(e) => setForm((f) => ({ ...f, sponsorId: e.target.value }))}
                  required
                >
                  <option value="">Chọn sponsor</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-300">Loại campaign</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  defaultValue={form.campaignType}
                  name="campaignType"
                  onChange={(e) => {
                    const type = e.target.value as CampaignFormInput["campaignType"];
                    setForm((f) => ({
                      ...f,
                      campaignType: type,
                      placement: getDefaultPlacementForType(type!)
                    }));
                  }}
                >
                  {CAMPAIGN_TYPE_DEFINITIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-300">Vị trí hiển thị (placement)</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  defaultValue={form.placement ?? ""}
                  name="placement"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      placement: (e.target.value || null) as CampaignFormInput["placement"]
                    }))
                  }
                >
                  <option value="">Mặc định theo loại</option>
                  {availablePlacements.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-300">Trạng thái</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  defaultValue={form.status}
                  name="status"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as CampaignFormInput["status"] }))
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  defaultValue={toLocalDatetime(form.startsAt ?? null)}
                  label="Bắt đầu"
                  name="startsAt"
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                  type="datetime-local"
                />
                <Input
                  defaultValue={toLocalDatetime(form.endsAt ?? null)}
                  label="Kết thúc"
                  name="endsAt"
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                  type="datetime-local"
                />
              </div>

              {permissions.canViewFinance ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    defaultValue={form.budgetVnd ?? ""}
                    label="Budget (VND)"
                    min={0}
                    name="budgetVnd"
                    type="number"
                  />
                  <Input
                    defaultValue={form.revenueVnd ?? ""}
                    label="Revenue (VND)"
                    min={0}
                    name="revenueVnd"
                    type="number"
                  />
                </div>
              ) : null}

              <Input
                defaultValue={form.disclosureText ?? "Được tài trợ"}
                label="Disclosure text *"
                name="disclosureText"
                onChange={(e) => setForm((f) => ({ ...f, disclosureText: e.target.value }))}
                required
              />
              <Input defaultValue={form.ctaText ?? ""} label="CTA text" name="ctaText" onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} />
              <Input defaultValue={form.ctaUrl ?? ""} label="CTA URL" name="ctaUrl" onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} />

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-300">Internal target type</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  defaultValue={form.targetType ?? "none"}
                  name="targetType"
                >
                  {TARGET_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input defaultValue={form.targetId ?? ""} label="Target ID / slug" name="targetId" />

              {form.campaignType === "sponsored_challenge" ? (
                <label className="block space-y-1 text-sm">
                  <span className="text-zinc-300">Liên kết challenge</span>
                  <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white" name="challengeId">
                    <option value="">Không liên kết</option>
                    {challenges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <Textarea
                defaultValue={form.description ?? ""}
                label="Mô tả"
                name="description"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <Textarea
                defaultValue={form.adminNote ?? ""}
                label="Ghi chú admin"
                name="adminNote"
              />
            </div>

            <div className="flex flex-col gap-4 bg-zinc-950/50 p-5">
              <CampaignPreview
                form={{
                  ...form,
                  sponsorName: sponsor?.name,
                  sponsorLogoUrl: sponsor?.logoUrl
                }}
                placement={form.placement}
              />
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-400">
                <p>Chỉ campaign <strong className="text-zinc-200">active</strong> hoặc <strong className="text-zinc-200">scheduled</strong> (đúng thời gian) mới hiển thị public.</p>
                <p className="mt-2">Mọi nội dung tài trợ phải có disclosure rõ ràng.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            {state.message ? (
              <p className={`mb-3 text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
                {state.message}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button disabled={!canSubmit} loading={pending} type="submit">
                {isEdit ? "Lưu campaign" : "Tạo campaign"}
              </Button>
              <Button onClick={onClose} type="button" variant="secondary">
                Hủy
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CampaignFormPanel({
  open,
  campaign,
  sponsors,
  challenges,
  permissions,
  onClose
}: CampaignFormPanelProps) {
  if (!open) return null;

  return (
    <CampaignFormPanelContent
      campaign={campaign}
      challenges={challenges}
      key={campaign?.id ?? "new"}
      onClose={onClose}
      permissions={permissions}
      sponsors={sponsors}
    />
  );
}
