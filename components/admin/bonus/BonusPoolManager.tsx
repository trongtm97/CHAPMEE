"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import { BonusAllocationTable } from "@/components/admin/bonus/BonusAllocationTable";
import {
  approveCreatorBonusPoolAction,
  calculateCreatorBonusPoolPreviewAction,
  createCreatorBonusPoolAction,
  creditCreatorBonusPoolAction
} from "@/lib/monetization/creator-bonus";
import type { CreatorBonusAllocation, CreatorBonusPool } from "@/types/creator-bonus";

type BonusPoolManagerProps = {
  pools: CreatorBonusPool[];
  allocationsByPool: Record<string, CreatorBonusAllocation[]>;
};

export function BonusPoolManager({ pools, allocationsByPool }: BonusPoolManagerProps) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("Bonus Pool tháng này");
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmountVnd, setTotalAmountVnd] = useState("10000000");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function createPool() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createCreatorBonusPoolAction({
        name,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        totalAmountVnd: Number(totalAmountVnd)
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể tạo bonus pool.");
        return;
      }
      setSuccess("Đã tạo bonus pool.");
      window.location.reload();
    });
  }

  function calculatePool(poolId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await calculateCreatorBonusPoolPreviewAction(poolId);
      if (!result.ok) {
        setError(result.error ?? "Không thể calculate bonus preview.");
        return;
      }
      setSuccess("Đã calculate preview.");
      window.location.reload();
    });
  }

  function approvePool(poolId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await approveCreatorBonusPoolAction(poolId);
      if (!result.ok) {
        setError(result.error ?? "Không thể approve bonus pool.");
        return;
      }
      setSuccess("Đã approve bonus pool.");
      window.location.reload();
    });
  }

  function creditPool(poolId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await creditCreatorBonusPoolAction(poolId);
      if (!result.ok) {
        setError(result.error ?? "Không thể credit bonus.");
        return;
      }
      setSuccess(`Đã credit ${result.data?.creditedCount ?? 0} allocations.`);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Tạo Bonus Pool</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Tên pool" onChange={(event) => setName(event.currentTarget.value)} value={name} />
          <Input
            label="Tổng quỹ (VND)"
            type="number"
            onChange={(event) => setTotalAmountVnd(event.currentTarget.value)}
            value={totalAmountVnd}
          />
          <Input label="Period start" type="date" onChange={(event) => setPeriodStart(event.currentTarget.value)} value={periodStart} />
          <Input label="Period end" type="date" onChange={(event) => setPeriodEnd(event.currentTarget.value)} value={periodEnd} />
        </div>
        <Button loading={pending} onClick={createPool} type="button">
          Tạo bonus pool
        </Button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      </Card>

      <div className="space-y-3">
        {pools.map((pool) => (
          <Card className="space-y-3" key={pool.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-black text-white">{pool.name}</p>
              <p className="text-sm text-zinc-300">{pool.status}</p>
            </div>
            <p className="text-sm text-zinc-300">
              {pool.total_amount_vnd.toLocaleString("vi-VN")} VND |{" "}
              {new Date(pool.period_start).toLocaleDateString()} -{" "}
              {new Date(pool.period_end).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button loading={pending} onClick={() => calculatePool(pool.id)} type="button" variant="secondary">
                Calculate preview
              </Button>
              <Button loading={pending} onClick={() => approvePool(pool.id)} type="button" variant="secondary">
                Approve
              </Button>
              <Button loading={pending} onClick={() => creditPool(pool.id)} type="button">
                Credit bonus
              </Button>
            </div>
            <BonusAllocationTable allocations={allocationsByPool[pool.id] ?? []} />
          </Card>
        ))}
        {pools.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có bonus pool nào.</p>
        ) : null}
      </div>
    </div>
  );
}
