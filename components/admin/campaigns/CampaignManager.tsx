"use client";

import { useActionState } from "react";
import { Card, Button, Input, SectionHeader } from "@/components/ui";
import {
  createCampaignAction,
  createSponsorAction,
  INITIAL_CAMPAIGN_ACTION_STATE,
  linkCampaignChallengeAction,
  updateCampaignAction
} from "@/lib/admin/campaign-actions";
import type { CampaignWithSponsor, SponsorRecord } from "@/types/campaign";
import type { ChallengeListItem } from "@/lib/supabase/challenges";

type CampaignManagerProps = {
  sponsors: SponsorRecord[];
  campaigns: CampaignWithSponsor[];
  challenges: ChallengeListItem[];
};

function ActionMessage({ ok, message }: { ok: boolean; message: string | null }) {
  if (!message) return null;
  return (
    <p className={`text-sm ${ok ? "text-emerald-300" : "text-red-300"}`}>
      {message}
    </p>
  );
}

export function CampaignManager({
  sponsors,
  campaigns,
  challenges
}: CampaignManagerProps) {
  const [sponsorState, sponsorAction, sponsorPending] = useActionState(
    createSponsorAction,
    INITIAL_CAMPAIGN_ACTION_STATE
  );
  const [campaignState, campaignAction, campaignPending] = useActionState(
    createCampaignAction,
    INITIAL_CAMPAIGN_ACTION_STATE
  );
  const [linkState, linkAction, linkPending] = useActionState(
    linkCampaignChallengeAction,
    INITIAL_CAMPAIGN_ACTION_STATE
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateCampaignAction,
    INITIAL_CAMPAIGN_ACTION_STATE
  );

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionHeader title="Tạo sponsor" subtitle="Đối tác thương hiệu tài trợ challenge/campaign." />
        <form action={sponsorAction} className="grid gap-3 md:grid-cols-2">
          <Input name="name" label="Tên sponsor" required />
          <Input name="contactEmail" label="Contact email" type="email" />
          <Input name="logoUrl" label="Logo URL" />
          <Input name="websiteUrl" label="Website URL" />
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Status</span>
            <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" name="status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <Button loading={sponsorPending} type="submit">Tạo sponsor</Button>
          </div>
        </form>
        <ActionMessage message={sponsorState.message} ok={sponsorState.ok} />
      </Card>

      <Card className="space-y-4">
        <SectionHeader title="Tạo campaign" subtitle="Hỗ trợ: sponsored_challenge, banner, native_card." />
        <form action={campaignAction} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Sponsor</span>
            <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" name="sponsorId" required>
              <option value="">Chọn sponsor</option>
              {sponsors.map((sponsor) => (
                <option key={sponsor.id} value={sponsor.id}>{sponsor.name}</option>
              ))}
            </select>
          </label>
          <Input name="name" label="Tên campaign" required />
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Campaign type</span>
            <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" name="campaignType">
              <option value="sponsored_challenge">sponsored_challenge</option>
              <option value="banner">banner</option>
              <option value="native_card">native_card</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Status</span>
            <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" name="status">
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="ended">ended</option>
            </select>
          </label>
          <Input label="Budget (VND)" name="budgetVnd" type="number" />
          <Input label="Revenue (VND)" name="revenueVnd" type="number" />
          <Input label="Starts at (ISO)" name="startsAt" />
          <Input label="Ends at (ISO)" name="endsAt" />
          <Input label="CTA text" name="ctaText" />
          <Input label="CTA URL" name="ctaUrl" />
          <Input label="Disclosure" name="disclosureText" defaultValue="Được tài trợ" />
          <div className="md:col-span-2">
            <Button loading={campaignPending} type="submit">Tạo campaign</Button>
          </div>
        </form>
        <ActionMessage message={campaignState.message} ok={campaignState.ok} />
      </Card>

      <Card className="space-y-4">
        <SectionHeader title="Gắn campaign vào challenge" subtitle="Challenge chỉ hiển thị tài trợ khi linked campaign active." />
        <form action={linkAction} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Challenge</span>
            <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" name="challengeId" required>
              <option value="">Chọn challenge</option>
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>{challenge.title}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Campaign</span>
            <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" name="campaignId">
              <option value="">Bỏ liên kết</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.status})
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Button loading={linkPending} type="submit">Cập nhật liên kết</Button>
          </div>
        </form>
        <ActionMessage message={linkState.message} ok={linkState.ok} />
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="Hiệu suất & điều khiển chiến dịch" subtitle="Active mới hiển thị public. Paused/ended sẽ ẩn." />
        {campaigns.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có campaign.</p>
        ) : (
          campaigns.map((campaign) => (
            <form action={updateAction} className="grid gap-3 rounded-xl border border-white/10 p-3 md:grid-cols-3" key={campaign.id}>
              <input name="campaignId" type="hidden" value={campaign.id} />
              <p className="text-sm text-zinc-200 md:col-span-3">
                {campaign.name} - {campaign.sponsor?.name ?? "Unknown sponsor"}
              </p>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Status</span>
                <select className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" defaultValue={campaign.status} name="status">
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="ended">ended</option>
                </select>
              </label>
              <Input defaultValue={String(campaign.budgetVnd ?? "")} label="Budget VND" name="budgetVnd" type="number" />
              <Input defaultValue={String(campaign.revenueVnd ?? "")} label="Revenue VND" name="revenueVnd" type="number" />
              <Input defaultValue={campaign.ctaText ?? ""} label="CTA text" name="ctaText" />
              <Input defaultValue={campaign.ctaUrl ?? ""} label="CTA URL" name="ctaUrl" />
              <div className="md:col-span-3 flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Performance quick view: budget {campaign.budgetVnd?.toLocaleString("vi-VN") ?? 0} / revenue{" "}
                  {campaign.revenueVnd?.toLocaleString("vi-VN") ?? 0}
                </span>
                <Button loading={updatePending} type="submit" variant="secondary">Lưu</Button>
              </div>
            </form>
          ))
        )}
        <ActionMessage message={updateState.message} ok={updateState.ok} />
      </Card>
    </div>
  );
}
