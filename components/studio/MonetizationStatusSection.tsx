"use client";

import { useActionState } from "react";
import { applyForCreatorMonetizationAction } from "@/lib/creator/monetization-actions";
import type { CreatorEligibilityResult, CreatorMonetizationProfile } from "@/types/creator-monetization";
import type { StudioMonetizationGateStatus } from "@/types/studio-monetization";
import { Button } from "@/components/ui";

const STATUS_LABELS: Record<StudioMonetizationGateStatus, string> = {
  disabled: "Chưa bật",
  not_eligible: "Chưa đủ điều kiện",
  pending_review: "Đang chờ duyệt",
  approved: "Đã bật kiếm tiền",
  suspended: "Bị tạm khóa kiếm tiền",
  rejected: "Bị từ chối"
};

const STATUS_CLASSES: Record<StudioMonetizationGateStatus, string> = {
  disabled: "bg-zinc-500/20 text-zinc-300",
  not_eligible: "bg-amber-400/15 text-amber-200",
  pending_review: "bg-sky-400/15 text-sky-200",
  approved: "bg-emerald-400/15 text-emerald-200",
  suspended: "bg-rose-400/15 text-rose-200",
  rejected: "bg-rose-400/15 text-rose-200"
};

type MonetizationStatusSectionProps = {
  gateStatus: StudioMonetizationGateStatus;
  eligibility: CreatorEligibilityResult;
  profile: CreatorMonetizationProfile | null;
};

const initialState = { ok: false, error: null as string | null };

export function MonetizationStatusSection({
  gateStatus,
  eligibility,
  profile
}: MonetizationStatusSectionProps) {
  const [state, action, pending] = useActionState(
    applyForCreatorMonetizationAction,
    initialState
  );

  const showApply =
    gateStatus !== "disabled" &&
    gateStatus !== "approved" &&
    gateStatus !== "suspended" &&
    eligibility.eligible;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Trạng thái kiếm tiền</h2>
          <p className="mt-1 text-sm text-zinc-400">
            ChapMee kiểm soát điều kiện và duyệt tài khoản tác giả.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLASSES[gateStatus]}`}
        >
          {STATUS_LABELS[gateStatus]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Follower" value={eligibility.stats.followers} />
        <Stat label="Lượt đọc" value={eligibility.stats.total_reads} />
        <Stat label="Chương" value={eligibility.stats.chapters_count} />
        <Stat label="Vi phạm" value={eligibility.stats.violations_count} />
      </div>

      {eligibility.reasons.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          {eligibility.reasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      ) : null}

      {profile?.rejected_reason ? (
        <p className="mt-3 text-sm text-rose-300">Lý do: {profile.rejected_reason}</p>
      ) : null}
      {profile?.suspended_reason ? (
        <p className="mt-3 text-sm text-rose-300">Lý do khóa: {profile.suspended_reason}</p>
      ) : null}

      {showApply ? (
        <form action={action} className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input name="accept_terms" type="checkbox" value="true" /> Tôi đồng ý điều
            khoản tác giả và chính sách kiếm tiền.
          </label>
          {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
          <Button disabled={pending} type="submit" variant="primary">
            {pending ? "Đang gửi..." : "Đăng ký bật kiếm tiền"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-100">{value.toLocaleString("vi-VN")}</p>
    </div>
  );
}
