"use client";

import { useActionState } from "react";
import { MonetizationConsentNotice } from "@/components/legal/ImplicitConsentNotice";
import { Button, Card, SectionHeader } from "@/components/ui";
import { applyForCreatorMonetizationAction } from "@/lib/creator/monetization-actions";
import type {
  CreatorEligibilityResult,
  CreatorMonetizationProfile
} from "@/types/creator-monetization";

type MonetizationStatusCardProps = {
  eligibility: CreatorEligibilityResult;
  profile: CreatorMonetizationProfile | null;
  enabledByAdmin: boolean;
};

const initialState = { ok: false, error: null as string | null };

export function MonetizationStatusCard({
  eligibility,
  profile,
  enabledByAdmin
}: MonetizationStatusCardProps) {
  const [state, action, pending] = useActionState(
    applyForCreatorMonetizationAction,
    initialState
  );

  if (!enabledByAdmin) return null;

  return (
    <Card className="space-y-4">
      <SectionHeader
        subtitle="Admin kiểm soát điều kiện và trạng thái duyệt."
        title="Kiếm tiền từ truyện"
      />
      <p className="text-sm text-zinc-300">
        Trạng thái hiện tại:{" "}
        <span className="font-semibold text-white">{profile?.status ?? "not_eligible"}</span>
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <p className="text-sm text-zinc-300">
          Followers: <span className="font-semibold text-white">{eligibility.stats.followers}</span>
        </p>
        <p className="text-sm text-zinc-300">
          Reads: <span className="font-semibold text-white">{eligibility.stats.total_reads}</span>
        </p>
        <p className="text-sm text-zinc-300">
          Chapters: <span className="font-semibold text-white">{eligibility.stats.chapters_count}</span>
        </p>
        <p className="text-sm text-zinc-300">
          Violations: <span className="font-semibold text-white">{eligibility.stats.violations_count}</span>
        </p>
      </div>

      {eligibility.reasons.length > 0 ? (
        <ul className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          {eligibility.reasons.map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-emerald-200">Bạn đã đủ điều kiện đăng ký kiếm tiền.</p>
      )}

      {profile?.status === "approved" ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          Monetization đã được duyệt.
        </p>
      ) : eligibility.eligible ? (
        <form action={action} className="space-y-2">
          {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
          <MonetizationConsentNotice />
          <Button loading={pending} type="submit">
            Đăng ký bật kiếm tiền
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
