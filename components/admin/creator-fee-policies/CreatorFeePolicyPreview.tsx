"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { previewCreatorFeePolicyAction } from "@/lib/admin/creator-fee-policies/preview-policy";
import { CREATOR_FEE_REVENUE_SOURCES } from "@/lib/admin/creator-fee-policies/constants";
import type { CreatorFeeRevenueSourceId, CreatorFeeSourceRates } from "@/types/creator-fee-policy";

type Props = {
  creatorId: string;
  policyId?: string | null;
  sourceRates?: CreatorFeeSourceRates | null;
};

export function CreatorFeePolicyPreview({ creatorId, policyId, sourceRates }: Props) {
  const [coinAmount, setCoinAmount] = useState("100");
  const [revenueSource, setRevenueSource] = useState<CreatorFeeRevenueSourceId>("paid_chapter");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof previewCreatorFeePolicyAction>
  >["preview"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runPreview() {
    startTransition(async () => {
      setError(null);
      const amount = Number(coinAmount);
      const res = await previewCreatorFeePolicyAction({
        creatorId,
        revenueSource,
        coinAmount: amount,
        sourceRates,
        policyId
      });
      if (res.error) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res.preview);
    });
  }

  useEffect(() => {
    if (creatorId) runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId, revenueSource, sourceRates, policyId]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
      <h4 className="font-semibold text-cyan-100">Preview chia doanh thu</h4>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Coin người đọc chi</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            inputMode="numeric"
            onChange={(e) => setCoinAmount(e.target.value)}
            value={coinAmount}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Loại giao dịch</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setRevenueSource(e.target.value as CreatorFeeRevenueSourceId)}
            value={revenueSource}
          >
            {CREATOR_FEE_REVENUE_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button disabled={pending} onClick={runPreview} type="button" variant="secondary">
        {pending ? "Đang tính…" : "Tính preview"}
      </Button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {result ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="text-zinc-300">
            Tổng coin: <span className="text-white">{result.totalCoin}</span>
          </p>
          <p className="text-zinc-300">
            Tác giả nhận:{" "}
            <span className="font-semibold text-emerald-300">
              {result.authorCoin} coin ({result.authorPercent}%)
            </span>
          </p>
          <p className="text-zinc-300">
            Nền tảng giữ:{" "}
            <span className="text-white">
              {result.platformCoin} coin ({result.platformPercent}%)
            </span>
          </p>
          <p className="text-zinc-300">
            Mặc định: tác giả {result.defaultAuthorPercent}% / nền tảng{" "}
            {result.defaultPlatformPercent}%
          </p>
          <p className="sm:col-span-2 text-zinc-300">
            Chênh lệch: tác giả{" "}
            <span className={result.authorDeltaCoin >= 0 ? "text-emerald-300" : "text-rose-300"}>
              {result.authorDeltaCoin >= 0 ? "+" : ""}
              {result.authorDeltaCoin} coin
            </span>
            , nền tảng{" "}
            <span className={result.platformDeltaCoin >= 0 ? "text-emerald-300" : "text-rose-300"}>
              {result.platformDeltaCoin >= 0 ? "+" : ""}
              {result.platformDeltaCoin} coin
            </span>
            {result.policyName ? ` · Policy: ${result.policyName}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
