"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { adminSetMonetizationBlockAction, adminSetPayoutBlockAction, adminUpdateRiskEventAction } from "@/lib/risk/risk-engine";
import type { RiskEvent } from "@/types/risk";

type RiskEventTableProps = {
  events: RiskEvent[];
};

export function RiskEventTable({ events }: RiskEventTableProps) {
  const [pending, startTransition] = useTransition();
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateRiskStatus(riskEventId: string, status: "reviewing" | "resolved" | "ignored") {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await adminUpdateRiskEventAction({
        riskEventId,
        status,
        adminNote
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật risk event.");
        return;
      }
      setSuccess(`Đã cập nhật ${riskEventId.slice(0, 8)} -> ${status}.`);
      window.location.reload();
    });
  }

  function setPayoutBlock(userId: string, blocked: boolean) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await adminSetPayoutBlockAction({ userId, blocked, adminNote });
      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật payout block.");
        return;
      }
      setSuccess(`${blocked ? "Block" : "Unblock"} payout cho ${userId.slice(0, 8)}.`);
      window.location.reload();
    });
  }

  function setMonetizationBlock(userId: string, blocked: boolean) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await adminSetMonetizationBlockAction({ userId, blocked, adminNote });
      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật monetization block.");
        return;
      }
      setSuccess(`${blocked ? "Suspend" : "Unsuspend"} monetization cho ${userId.slice(0, 8)}.`);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <Input
        label="Admin note"
        onChange={(event) => setAdminNote(event.currentTarget.value)}
        type="text"
        value={adminNote}
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <div className="space-y-2">
        {events.map((event) => {
          const targetUserId = event.creator_user_id ?? event.user_id ?? null;
          return (
            <div
              className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              key={event.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-zinc-100">{event.event_type}</span>
                <span className="text-zinc-300">{event.severity}</span>
                <span className="text-zinc-300">score {event.risk_score}</span>
                <span className="text-zinc-300">{event.status}</span>
                <span className="text-zinc-400">{new Date(event.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-zinc-300">{event.reason}</p>
              <p className="text-xs text-zinc-500">
                user: {event.user_id?.slice(0, 8) ?? "-"} | creator: {event.creator_user_id?.slice(0, 8) ?? "-"}
              </p>
              <p className="rounded-lg bg-black/20 p-2 text-xs text-zinc-400">
                {JSON.stringify(event.metadata ?? {}, null, 2)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending}
                  onClick={() => updateRiskStatus(event.id, "reviewing")}
                  type="button"
                  variant="secondary"
                >
                  Mark reviewing
                </Button>
                <Button
                  disabled={pending}
                  onClick={() => updateRiskStatus(event.id, "resolved")}
                  type="button"
                  variant="secondary"
                >
                  Resolve
                </Button>
                <Button
                  disabled={pending}
                  onClick={() => updateRiskStatus(event.id, "ignored")}
                  type="button"
                  variant="secondary"
                >
                  Ignore
                </Button>
                {targetUserId ? (
                  <>
                    <Button
                      disabled={pending}
                      onClick={() => setPayoutBlock(targetUserId, true)}
                      type="button"
                      variant="danger"
                    >
                      Block payout
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => setPayoutBlock(targetUserId, false)}
                      type="button"
                      variant="secondary"
                    >
                      Unblock payout
                    </Button>
                    <Button
                      disabled={pending}
                      onClick={() => setMonetizationBlock(targetUserId, true)}
                      type="button"
                      variant="danger"
                    >
                      Suspend monetization
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        {events.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có risk event.</p>
        ) : null}
      </div>
    </div>
  );
}
