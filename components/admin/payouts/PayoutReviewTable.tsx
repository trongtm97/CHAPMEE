"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { adminReleasePendingRevenueAction, adminUpdatePayoutStatusAction } from "@/lib/monetization/payouts";
import type { PayoutRequest, PayoutRequestStatus } from "@/types/payout";
import type { CreatorWallet } from "@/types/wallet";

type PayoutReviewTableProps = {
  requests: PayoutRequest[];
  walletsByCreator: Record<string, CreatorWallet>;
};

const NEXT_STATUSES: PayoutRequestStatus[] = [
  "under_review",
  "approved",
  "processing",
  "completed",
  "rejected",
  "failed"
];

export function PayoutReviewTable({
  requests,
  walletsByCreator
}: PayoutReviewTableProps) {
  const [pending, startTransition] = useTransition();
  const [adminNote, setAdminNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateStatus(requestId: string, status: PayoutRequestStatus) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await adminUpdatePayoutStatusAction({
        requestId,
        status,
        adminNote,
        rejectReason
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật payout.");
        return;
      }
      setSuccess(`Đã cập nhật payout ${requestId.slice(0, 8)} -> ${status}.`);
      window.location.reload();
    });
  }

  function releasePending(creatorUserId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await adminReleasePendingRevenueAction({ creatorUserId });
      if (!result.ok) {
        setError(result.error ?? "Không thể release pending revenue.");
        return;
      }
      setSuccess(
        `Đã release ${result.data?.releasedAmountVnd?.toLocaleString("vi-VN") ?? 0} VND cho creator ${creatorUserId.slice(0, 8)}.`
      );
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Admin note"
          onChange={(event) => setAdminNote(event.currentTarget.value)}
          type="text"
          value={adminNote}
        />
        <Input
          label="Reject reason"
          onChange={(event) => setRejectReason(event.currentTarget.value)}
          type="text"
          value={rejectReason}
        />
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <div className="space-y-2">
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có payout request.</p>
        ) : (
          requests.map((request) => {
            const wallet = walletsByCreator[request.creator_user_id];
            return (
              <div
                className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                key={request.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-zinc-100">{request.id.slice(0, 8)}</span>
                  <span className="text-zinc-300">{request.creator_user_id.slice(0, 8)}</span>
                  <span className="text-zinc-300">{request.method}</span>
                  <span className="text-zinc-100">{request.amount_vnd.toLocaleString("vi-VN")} VND</span>
                  <span className="text-zinc-300">{request.status}</span>
                </div>
                {wallet ? (
                  <p className="text-xs text-zinc-400">
                    Wallet - pending: {wallet.pending_revenue_vnd.toLocaleString("vi-VN")} | available:{" "}
                    {wallet.available_revenue_vnd.toLocaleString("vi-VN")} | locked:{" "}
                    {wallet.locked_revenue_vnd.toLocaleString("vi-VN")}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES.map((status) => (
                    <Button
                      disabled={pending}
                      key={`${request.id}-${status}`}
                      onClick={() => updateStatus(request.id, status)}
                      type="button"
                      variant={status === "rejected" || status === "failed" ? "danger" : "secondary"}
                    >
                      {status}
                    </Button>
                  ))}
                  <Button
                    disabled={pending}
                    onClick={() => releasePending(request.creator_user_id)}
                    type="button"
                    variant="secondary"
                  >
                    Release pending revenue
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
