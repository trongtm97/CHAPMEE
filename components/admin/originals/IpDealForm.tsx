"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { adminCreateIpDealAction, adminCreateIpDealFinancialAction } from "@/lib/monetization/originals";
import type { IpDealType } from "@/types/originals";

type IpDealFormProps = {
  storyId?: string;
  creatorUserId?: string;
};

export function IpDealForm({ storyId, creatorUserId }: IpDealFormProps) {
  const [pending, startTransition] = useTransition();
  const [manualStoryId, setManualStoryId] = useState(storyId ?? "");
  const [manualCreatorUserId, setManualCreatorUserId] = useState(creatorUserId ?? "");
  const [dealType, setDealType] = useState<IpDealType>("licensing");
  const [status, setStatus] = useState("draft");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onCreateDeal() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const storyTarget = storyId ?? manualStoryId;
      const creatorTarget = creatorUserId ?? manualCreatorUserId;
      if (!storyTarget || !creatorTarget) {
        setError("Cần story ID và creator user ID.");
        return;
      }
      const result = await adminCreateIpDealAction({
        storyId: storyTarget,
        creatorUserId: creatorTarget,
        dealType,
        status: status as never,
        rights: {
          audio: true,
          comic: true,
          short_film: true,
          web_drama: true,
          publishing: true,
          game: false,
          merchandise: false,
          territory: "Vietnam",
          language: "vi"
        },
        advanceAmountVnd: Number(advanceAmount),
        adminNote: "MVP deal"
      });
      if (!result.ok || !result.data) {
        setError(result.error ?? "Không thể tạo IP deal.");
        return;
      }
      if (Number(advanceAmount) > 0) {
        await adminCreateIpDealFinancialAction({
          dealId: result.data.id,
          creatorUserId: creatorTarget,
          amountVnd: Number(advanceAmount),
          type: "advance",
          description: "Advance payment",
          shouldCreateLedger: true
        });
      }
      setSuccess("Đã tạo IP deal.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 p-3">
      <p className="text-sm font-semibold text-white">Tạo IP Deal</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {!storyId ? (
          <Input
            label="Story ID"
            onChange={(event) => setManualStoryId(event.currentTarget.value)}
            value={manualStoryId}
          />
        ) : null}
        {!creatorUserId ? (
          <Input
            label="Creator user ID"
            onChange={(event) => setManualCreatorUserId(event.currentTarget.value)}
            value={manualCreatorUserId}
          />
        ) : null}
        <label className="space-y-1 text-sm">
          <span className="text-zinc-200">Deal type</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setDealType(event.currentTarget.value as IpDealType)}
            value={dealType}
          >
            <option value="exclusive">exclusive</option>
            <option value="non_exclusive">non_exclusive</option>
            <option value="option">option</option>
            <option value="licensing">licensing</option>
            <option value="co_production">co_production</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-200">Status</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setStatus(event.currentTarget.value)}
            value={status}
          >
            <option value="draft">draft</option>
            <option value="negotiating">negotiating</option>
            <option value="signed">signed</option>
            <option value="active">active</option>
          </select>
        </label>
        <Input
          label="Advance amount (VND)"
          type="number"
          onChange={(event) => setAdvanceAmount(event.currentTarget.value)}
          value={advanceAmount}
        />
      </div>
      <Button loading={pending} onClick={onCreateDeal} type="button">
        Tạo deal
      </Button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
    </div>
  );
}
