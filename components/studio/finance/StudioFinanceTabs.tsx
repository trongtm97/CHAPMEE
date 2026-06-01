"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type StudioFinanceTabsProps = {
  overview: ReactNode;
  adRevenue: ReactNode;
};

export function StudioFinanceTabs({ overview, adRevenue }: StudioFinanceTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "ads" ? "ads" : "overview";

  const setTab = (next: "overview" | "ads") => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "ads") params.set("tab", "ads");
    else params.delete("tab");
    const q = params.toString();
    router.replace(q ? `/studio/finance?${q}` : "/studio/finance", { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "overview"
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => setTab("overview")}
        >
          Tổng quan tài chính
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "ads" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => setTab("ads")}
        >
          Doanh thu quảng cáo
        </button>
      </div>

      {tab === "overview" ? overview : adRevenue}
    </div>
  );
}
