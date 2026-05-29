"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import type { FinanceExportType } from "@/types/finance-export";

const EXPORT_TYPES: FinanceExportType[] = [
  "transactions",
  "coin_purchases",
  "creator_revenue",
  "payouts",
  "refunds",
  "chargebacks",
  "supporter_transactions",
  "vip_subscriptions",
  "fan_club_memberships",
  "sponsored_campaign_revenue"
];

export function FinanceExportPanel() {
  const [exportType, setExportType] = useState<FinanceExportType>("transactions");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [userId, setUserId] = useState("");
  const [creatorUserId, setCreatorUserId] = useState("");
  const [source, setSource] = useState("");
  const [currency, setCurrency] = useState("VND");

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("exportType", exportType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (userId) params.set("userId", userId);
    if (creatorUserId) params.set("creatorUserId", creatorUserId);
    if (source) params.set("source", source);
    if (currency) params.set("currency", currency);
    return `/api/admin/finance/export?${params.toString()}`;
  }, [creatorUserId, currency, exportType, from, source, status, to, type, userId]);

  return (
    <Card className="space-y-4">
      <SectionHeader
        title="Xuất báo cáo tài chính"
        subtitle="CSV phía server, chỉ dành cho admin/founder."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-2 text-sm text-zinc-300">
          <span>Export type</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2"
            onChange={(event) => setExportType(event.currentTarget.value as FinanceExportType)}
            value={exportType}
          >
            {EXPORT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <Input label="From (ISO)" onChange={(event) => setFrom(event.currentTarget.value)} value={from} />
        <Input label="To (ISO)" onChange={(event) => setTo(event.currentTarget.value)} value={to} />
        <Input label="Status" onChange={(event) => setStatus(event.currentTarget.value)} value={status} />
        <Input label="Transaction type" onChange={(event) => setType(event.currentTarget.value)} value={type} />
        <Input label="Source/module" onChange={(event) => setSource(event.currentTarget.value)} value={source} />
        <Input label="User ID" onChange={(event) => setUserId(event.currentTarget.value)} value={userId} />
        <Input label="Creator user ID" onChange={(event) => setCreatorUserId(event.currentTarget.value)} value={creatorUserId} />
        <Input label="Currency" onChange={(event) => setCurrency(event.currentTarget.value)} value={currency} />
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={exportUrl}>
          <Button type="button">Tải CSV</Button>
        </a>
      </div>
      <p className="text-xs text-zinc-500">
        Lưu ý: không chứa provider secret hay thông tin thanh toán nhạy cảm.
      </p>
    </Card>
  );
}
