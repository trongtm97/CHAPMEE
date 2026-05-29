"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { setCommunityTrustedAction } from "@/lib/admin/community-trust-actions";
import { trustTierLabel } from "@/lib/community/auto-moderation-labels";
import type { UserTrustScoreBreakdown } from "@/types/community-auto-moderation";

type UserTrustScoreCardProps = {
  userId: string;
  trust: UserTrustScoreBreakdown;
  canEdit: boolean;
};

export function UserTrustScoreCard({
  userId,
  trust,
  canEdit
}: UserTrustScoreCardProps) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <h4 className="text-sm font-semibold text-white">Độ tin cậy cộng đồng</h4>
      <p className="mt-2 text-2xl font-bold tabular-nums text-cyan-300">
        {trust.score}{" "}
        <span className="text-sm font-normal text-zinc-400">
          ({trustTierLabel(trust.score)})
        </span>
      </p>
      <ul className="mt-3 space-y-1 text-xs text-zinc-500">
        <li>Email xác minh: {trust.emailVerified ? "Có" : "Chưa"}</li>
        <li>Tuổi tài khoản: {trust.accountAgeDays} ngày</li>
        <li>Bài đã duyệt: {trust.approvedPostCount}</li>
        <li>Từ chối 30 ngày: {trust.rejectedPostCount30d}</li>
        <li>Báo cáo 30 ngày: {trust.validReportCount30d}</li>
        <li>Strike: {trust.activeStrikeCount}</li>
        <li>Tác giả xác thực: {trust.isVerifiedAuthor ? "Có" : "Không"}</li>
        <li>Tin cậy thủ công: {trust.communityTrusted ? "Có" : "Không"}</li>
      </ul>
      {trust.factors.length > 0 ? (
        <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-zinc-600">
          {trust.factors.map((f) => (
            <li key={f.key}>
              {f.label}: {f.delta > 0 ? "+" : ""}
              {f.delta}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setCommunityTrustedAction({
                  userId,
                  trusted: true,
                  note
                });
              })
            }
            type="button"
            variant="secondary"
          >
            Đánh dấu tin cậy
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setCommunityTrustedAction({
                  userId,
                  trusted: false,
                  note
                });
              })
            }
            type="button"
            variant="ghost"
          >
            Bỏ tin cậy
          </Button>
          <input
            className="min-w-[140px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú admin"
            value={note}
          />
        </div>
      ) : null}
    </div>
  );
}
