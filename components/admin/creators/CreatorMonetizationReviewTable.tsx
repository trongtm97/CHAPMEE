"use client";

import { useActionState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import {
  approveCreatorMonetizationAction,
  rejectCreatorMonetizationAction,
  suspendCreatorMonetizationAction,
  updateCreatorRevenueShareAction
} from "@/lib/admin/creator-monetization-actions";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";

type CreatorMonetizationReviewTableProps = {
  profiles: CreatorMonetizationProfile[];
};

const initialState = { ok: false, error: null as string | null };

function Actions({ profile }: { profile: CreatorMonetizationProfile }) {
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
  const [customState, customAction, savingCustom] = useActionState(
    updateCreatorRevenueShareAction,
    initialState
  );

  return (
    <Card className="space-y-3">
      <p className="text-sm text-zinc-300">User: {profile.user_id}</p>
      <p className="text-sm text-zinc-300">Status: {profile.status}</p>
      <div className="flex flex-wrap gap-2">
        <form action={approveAction}>
          <input name="profile_id" type="hidden" value={profile.id} />
          <Button loading={approving} type="submit" variant="secondary">
            Approve
          </Button>
        </form>
        <form action={rejectAction} className="flex gap-2">
          <input name="profile_id" type="hidden" value={profile.id} />
          <input name="reason" type="hidden" value="Rejected by admin review." />
          <Button loading={rejecting} type="submit" variant="danger">
            Reject
          </Button>
        </form>
        <form action={suspendAction}>
          <input name="profile_id" type="hidden" value={profile.id} />
          <input name="reason" type="hidden" value="Suspended due to policy violation." />
          <Button loading={suspending} type="submit" variant="danger">
            Suspend
          </Button>
        </form>
      </div>

      <form action={customAction} className="space-y-2 rounded-xl border border-white/10 p-3">
        <input name="profile_id" type="hidden" value={profile.id} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input defaultValue="90" label="Tip %" name="tip_percent" type="number" />
          <Input defaultValue="70" label="Paid chapter %" name="paid_chapter_percent" type="number" />
          <Input defaultValue="60" label="VIP pool %" name="vip_pool_percent" type="number" />
          <Input defaultValue="70" label="Fan club %" name="fan_club_percent" type="number" />
        </div>
        <label className="text-sm text-zinc-300">
          <input
            defaultChecked={profile.payout_enabled}
            name="payout_enabled"
            type="checkbox"
            value="true"
          />{" "}
          payout_enabled
        </label>
        {(approveState.error || rejectState.error || suspendState.error || customState.error) ? (
          <p className="text-sm text-red-300">
            {approveState.error ?? rejectState.error ?? suspendState.error ?? customState.error}
          </p>
        ) : null}
        <Button loading={savingCustom} type="submit" variant="secondary">
          Lưu custom revenue share
        </Button>
      </form>
    </Card>
  );
}

export function CreatorMonetizationReviewTable({
  profiles
}: CreatorMonetizationReviewTableProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Duyệt/từ chối/tạm dừng và đặt tỷ lệ doanh thu riêng."
        title="Monetization tác giả review"
      />
      {profiles.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-400">Không có creator cần review.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <Actions key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </section>
  );
}
