"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { createCreatorFeePolicyAction } from "@/lib/admin/create-creator-fee-policy";
import { updateCreatorFeePolicyAction } from "@/lib/admin/update-creator-fee-policy";
import type { CreatorFeePolicyRow } from "@/types/creator-fee-policy";

type CreatorFeePolicyFormProps = {
  creatorId: string;
  editing?: CreatorFeePolicyRow | null;
  onSuccess: () => void;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreatorFeePolicyForm({ creatorId, editing, onSuccess }: CreatorFeePolicyFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [policyName, setPolicyName] = useState(editing?.policy_name ?? "");
  const [creatorShare, setCreatorShare] = useState(
    editing?.creator_revenue_share_percent?.toString() ?? ""
  );
  const [platformFee, setPlatformFee] = useState(editing?.platform_fee_percent?.toString() ?? "");
  const [processingFee, setProcessingFee] = useState(
    editing?.payment_processing_fee_percent?.toString() ?? ""
  );
  const [processingFixed, setProcessingFixed] = useState(
    editing?.payment_processing_fixed_fee?.toString() ?? ""
  );
  const [tipPlatformFee, setTipPlatformFee] = useState(
    editing?.tip_platform_fee_percent?.toString() ?? ""
  );
  const [minWithdraw, setMinWithdraw] = useState(
    editing?.min_withdraw_amount_override?.toString() ?? ""
  );
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(editing?.starts_at) || toDatetimeLocal(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(editing?.ends_at));
  const [note, setNote] = useState(editing?.note ?? "");
  const [publicNote, setPublicNote] = useState(editing?.public_note ?? "");
  const [showDetails, setShowDetails] = useState(editing?.show_details_to_creator !== false);

  function parseOptionalNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  function submit() {
    startTransition(async () => {
      setMessage(null);
      const payload = {
        creatorId,
        policyName,
        creatorRevenueSharePercent: parseOptionalNumber(creatorShare),
        platformFeePercent: parseOptionalNumber(platformFee),
        paymentProcessingFeePercent: parseOptionalNumber(processingFee),
        paymentProcessingFixedFee: parseOptionalNumber(processingFixed),
        tipPlatformFeePercent: parseOptionalNumber(tipPlatformFee),
        minWithdrawAmountOverride: parseOptionalNumber(minWithdraw),
        note,
        publicNote,
        showDetailsToCreator: showDetails,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null
      };

      const result = editing
        ? await updateCreatorFeePolicyAction({ ...payload, policyId: editing.id })
        : await createCreatorFeePolicyAction(payload);

      if (!result.ok) {
        setMessage(result.error ?? "Lỗi không xác định.");
        return;
      }

      setMessage(editing ? "Đã cập nhật chính sách." : "Đã tạo chính sách mới.");
      onSuccess();
    });
  }

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-white">
        {editing ? "Sửa chính sách phí" : "Tạo chính sách phí riêng"}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Tên chính sách</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setPolicyName(e.target.value)}
            value={policyName}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Creator revenue share %</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="decimal"
            onChange={(e) => setCreatorShare(e.target.value)}
            placeholder="VD: 90"
            value={creatorShare}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Platform fee %</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="decimal"
            onChange={(e) => setPlatformFee(e.target.value)}
            placeholder="VD: 10"
            value={platformFee}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Payment processing fee %</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="decimal"
            onChange={(e) => setProcessingFee(e.target.value)}
            value={processingFee}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Processing fixed fee (VND)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="numeric"
            onChange={(e) => setProcessingFixed(e.target.value)}
            value={processingFixed}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Tip platform fee %</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="decimal"
            onChange={(e) => setTipPlatformFee(e.target.value)}
            value={tipPlatformFee}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Min withdraw override (VND)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="numeric"
            onChange={(e) => setMinWithdraw(e.target.value)}
            value={minWithdraw}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Bắt đầu hiệu lực</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setStartsAt(e.target.value)}
            type="datetime-local"
            value={startsAt}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Kết thúc (tuỳ chọn)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setEndsAt(e.target.value)}
            type="datetime-local"
            value={endsAt}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Ghi chú nội bộ (admin)</span>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Ghi chú công khai cho tác giả</span>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setPublicNote(e.target.value)}
            value={publicNote}
          />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
            type="checkbox"
          />
          <span className="text-sm text-zinc-300">Cho tác giả xem chi tiết tỷ lệ trên Studio</span>
        </label>
      </div>

      {message ? <p className="text-sm text-amber-300">{message}</p> : null}

      <Button disabled={isPending} onClick={submit} type="button">
        {isPending ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo chính sách"}
      </Button>
    </Card>
  );
}
