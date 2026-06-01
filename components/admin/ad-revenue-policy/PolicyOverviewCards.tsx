"use client";

import type { AdminAdRevenuePolicyOverview } from "@/lib/creator-ad-revenue/get-admin-policy-overview";
import type { CreatorAdRevenuePolicy } from "@/types/creator-ad-revenue-policy";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

type CardTone = "ok" | "warn" | "danger" | "muted";

function toneClass(tone: CardTone) {
  if (tone === "ok") return "border-emerald-500/25 bg-emerald-500/5";
  if (tone === "warn") return "border-amber-500/25 bg-amber-500/5";
  if (tone === "danger") return "border-red-500/25 bg-red-500/5";
  return "border-white/10 bg-white/[0.03]";
}

export function PolicyOverviewCards({
  policy,
  overview
}: {
  policy: CreatorAdRevenuePolicy;
  overview: Omit<AdminAdRevenuePolicyOverview, "policy">;
}) {
  const programTone: CardTone = !policy.is_enabled
    ? "muted"
    : policy.beta_mode
      ? "warn"
      : "ok";

  const cards: { label: string; value: string; tone: CardTone; hint?: string }[] = [
    {
      label: "Chương trình",
      value: !policy.is_enabled ? "Tắt" : policy.beta_mode ? "Beta" : "Đang bật",
      tone: programTone
    },
    {
      label: "Quỹ tác giả",
      value: `${policy.creator_pool_percent}%`,
      tone: "ok"
    },
    {
      label: "Dự phòng",
      value: `${policy.reserve_percent}% · ${policy.reserve_hold_days} ngày`,
      tone: "warn"
    },
    {
      label: "Ngưỡng rút",
      value: formatVnd(policy.min_payout_vnd),
      tone: "ok"
    },
    {
      label: "Tác giả đủ điều kiện",
      value: String(overview.eligibleCreators),
      tone: overview.eligibleCreators > 0 ? "ok" : "muted"
    },
    {
      label: "Đang giữ doanh thu",
      value: String(overview.fraudHoldCreators),
      tone: overview.fraudHoldCreators > 0 ? "danger" : "ok"
    },
    {
      label: "Thiếu KYC/thuế/payout",
      value: String(overview.missingComplianceCreators),
      tone: overview.missingComplianceCreators > 0 ? "warn" : "ok"
    },
    {
      label: "Cảnh báo fraud mở",
      value: String(overview.openFraudSignals),
      tone: overview.openFraudSignals > 0 ? "danger" : "ok"
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div className={`rounded-xl border px-4 py-3 ${toneClass(card.tone)}`} key={card.label}>
          <p className="text-xs text-zinc-500">{card.label}</p>
          <p className="mt-1 text-lg font-semibold text-white">{card.value}</p>
          {card.hint ? <p className="mt-1 text-[10px] text-zinc-600">{card.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
