"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { FinanceTimeFilter } from "@/types/finance";

const PRESETS: Array<{ id: FinanceTimeFilter; label: string }> = [
  { id: "today", label: "Hôm nay" },
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
  { id: "month", label: "Tháng này" },
  { id: "all", label: "Tất cả" }
];

type FinanceDateFilterProps = {
  active: FinanceTimeFilter;
  rangeLabel: string;
  customFrom?: string | null;
  customTo?: string | null;
};

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function FinanceDateFilter({
  active,
  rangeLabel,
  customFrom,
  customTo
}: FinanceDateFilterProps) {
  const router = useRouter();
  const [from, setFrom] = useState(toDateInputValue(customFrom));
  const [to, setTo] = useState(toDateInputValue(customTo));

  function applyCustom() {
    if (!from) return;
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/finance?${params.toString()}`);
  }

  return (
    <Card className="space-y-4">
      <h3 className="text-base font-black text-white">Bộ lọc thời gian</h3>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((filter) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              active === filter.id
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/10 bg-white/[0.02] text-zinc-200"
            }`}
            href={`/admin/finance?range=${filter.id}`}
            key={filter.id}
          >
            {filter.label}
          </Link>
        ))}
        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            active === "custom"
              ? "bg-cyan-300 text-zinc-950"
              : "border border-white/10 bg-white/[0.02] text-zinc-200"
          }`}
        >
          Tùy chỉnh
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Từ ngày" onChange={(e) => setFrom(e.currentTarget.value)} type="date" value={from} />
        <Input label="Đến ngày" onChange={(e) => setTo(e.currentTarget.value)} type="date" value={to} />
        <div className="flex items-end">
          <Button onClick={applyCustom} type="button">
            Áp dụng
          </Button>
        </div>
      </div>
      <p className="text-sm text-zinc-400">
        Đang xem: <span className="font-semibold text-zinc-200">{rangeLabel}</span>
      </p>
    </Card>
  );
}
