"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { rebuildFairDistributionRollupsAction } from "@/lib/admin/fair-distribution-actions";

export function FairDistributionAdminTools() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRebuild() {
    setMessage(null);
    startTransition(async () => {
      const result = await rebuildFairDistributionRollupsAction();
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `Rollup xong: ${result.result.authorRows} author rows, ${result.result.taxonomyRows} taxonomy rows.`
      );
    });
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-bold text-white">Công cụ vận hành FDS</p>
        <p className="text-xs text-zinc-500">
          Rebuild rollup exposure ngày hôm qua từ `exposure_events`.
        </p>
      </div>
      <button
        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:border-white/20 disabled:opacity-60"
        disabled={pending}
        onClick={handleRebuild}
        type="button"
      >
        {pending ? "Đang rollup..." : "Rebuild exposure rollup"}
      </button>
      {message ? <p className="w-full text-xs text-zinc-400">{message}</p> : null}
    </Card>
  );
}
