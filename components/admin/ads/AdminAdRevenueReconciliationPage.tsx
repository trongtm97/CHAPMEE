"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AdminAdsMonetizationSectionNav } from "@/components/admin/ads/AdminAdsMonetizationSectionNav";
import { Button, Input } from "@/components/ui";
import type {
  AdRevenueCreatorAllocationListItem,
  AdRevenueMonthlyReconciliation,
  AdRevenueReconciliationWithAllocations
} from "@/types/ad-revenue-reconciliation";
import { AD_REVENUE_RECONCILIATION_STATUS_LABELS } from "@/types/ad-revenue-reconciliation";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatPercent(value: number) {
  return `${value.toFixed(4)}%`;
}

const DISCLAIMER =
  "Đối soát dựa trên doanh thu đối tác quảng cáo đã chốt — không dùng RPM/ước tính làm số thanh toán cuối.";

type AdminAdRevenueReconciliationPageProps = {
  initialList: AdRevenueMonthlyReconciliation[];
  initialDetail: AdRevenueReconciliationWithAllocations | null;
  selectedId: string | null;
  canUpdate: boolean;
};

const emptyForm = {
  month: "",
  gross_partner_revenue_vnd: 0,
  invalid_traffic_adjustment_vnd: 0,
  refund_adjustment_vnd: 0,
  tax_fee_adjustment_vnd: 0,
  other_adjustment_vnd: 0,
  notes: ""
};

export function AdminAdRevenueReconciliationPage({
  initialList,
  initialDetail,
  selectedId: initialSelectedId,
  canUpdate
}: AdminAdRevenueReconciliationPageProps) {
  const [list, setList] = useState(initialList);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<AdRevenueReconciliationWithAllocations | null>(
    initialDetail
  );
  const [previewAllocations, setPreviewAllocations] = useState<
    AdRevenueCreatorAllocationListItem[] | null
  >(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const isDraft = detail?.status === "draft";
  const readOnly = !canUpdate || !isDraft;

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/ad-revenue-reconciliation/${id}`);
    const json = (await res.json()) as {
      reconciliation?: AdRevenueReconciliationWithAllocations;
      error?: string;
    };
    if (json.reconciliation) {
      setDetail(json.reconciliation);
      setForm({
        month: json.reconciliation.month,
        gross_partner_revenue_vnd: json.reconciliation.gross_partner_revenue_vnd,
        invalid_traffic_adjustment_vnd: json.reconciliation.invalid_traffic_adjustment_vnd,
        refund_adjustment_vnd: json.reconciliation.refund_adjustment_vnd,
        tax_fee_adjustment_vnd: json.reconciliation.tax_fee_adjustment_vnd,
        other_adjustment_vnd: json.reconciliation.other_adjustment_vnd,
        notes: json.reconciliation.notes ?? ""
      });
      setPreviewAllocations(null);
    }
    return json.error;
  }, []);

  const reloadList = async () => {
    const res = await fetch("/api/admin/ad-revenue-reconciliation");
    const json = (await res.json()) as { reconciliations?: AdRevenueMonthlyReconciliation[] };
    if (json.reconciliations) setList(json.reconciliations);
  };

  const selectPeriod = async (id: string) => {
    setSelectedId(id);
    setMessage(null);
    await loadDetail(id);
  };

  const createPeriod = async () => {
    if (!canUpdate) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ad-revenue-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = (await res.json()) as {
        reconciliation?: AdRevenueMonthlyReconciliation;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Tạo kỳ thất bại.");
        return;
      }
      if (json.reconciliation) {
        setMessage(`Đã tạo kỳ ${json.reconciliation.month}.`);
        setCreateOpen(false);
        await reloadList();
        await selectPeriod(json.reconciliation.id);
      }
    } finally {
      setPending(false);
    }
  };

  const savePeriod = async () => {
    if (!selectedId || !canUpdate) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/ad-revenue-reconciliation/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gross_partner_revenue_vnd: form.gross_partner_revenue_vnd,
          invalid_traffic_adjustment_vnd: form.invalid_traffic_adjustment_vnd,
          refund_adjustment_vnd: form.refund_adjustment_vnd,
          tax_fee_adjustment_vnd: form.tax_fee_adjustment_vnd,
          other_adjustment_vnd: form.other_adjustment_vnd,
          notes: form.notes
        })
      });
      const json = (await res.json()) as {
        reconciliation?: AdRevenueMonthlyReconciliation;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Lưu thất bại.");
        return;
      }
      setMessage("Đã lưu kỳ đối soát.");
      await reloadList();
      await loadDetail(selectedId);
    } finally {
      setPending(false);
    }
  };

  const runCalculate = async (preview: boolean) => {
    if (!selectedId) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/ad-revenue-reconciliation/${selectedId}/calculate?preview=${preview}`,
        { method: "POST" }
      );
      const json = (await res.json()) as {
        allocations?: AdRevenueCreatorAllocationListItem[];
        summary?: { totalContributionPercent: number };
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Tính phân bổ thất bại.");
        return;
      }
      if (preview) {
        setPreviewAllocations(json.allocations ?? []);
        setMessage(
          `Preview: ${json.allocations?.length ?? 0} tác giả, tổng % = ${formatPercent(json.summary?.totalContributionPercent ?? 0)}`
        );
      } else {
        setPreviewAllocations(null);
        setMessage(
          `Đã lưu phân bổ. Tổng contribution % ≈ ${formatPercent(json.summary?.totalContributionPercent ?? 0)}`
        );
        await loadDetail(selectedId);
      }
    } finally {
      setPending(false);
    }
  };

  const lockPeriod = async () => {
    if (!selectedId) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ad-revenue-reconciliation/${selectedId}/lock`, {
        method: "POST"
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Khóa kỳ thất bại.");
        return;
      }
      setMessage("Đã khóa kỳ. Creator có thể xem số đã đối soát.");
      await reloadList();
      await loadDetail(selectedId);
    } finally {
      setPending(false);
    }
  };

  const markReconciled = async () => {
    if (!selectedId) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ad-revenue-reconciliation/${selectedId}/reconcile`, {
        method: "POST"
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Đánh dấu đối soát thất bại.");
        return;
      }
      setMessage("Đã đánh dấu kỳ là reconciled (payable).");
      await reloadList();
      await loadDetail(selectedId);
    } finally {
      setPending(false);
    }
  };

  const cancelPeriod = async () => {
    if (!selectedId) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ad-revenue-reconciliation/${selectedId}/cancel`, {
        method: "POST"
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Hủy kỳ thất bại.");
        return;
      }
      setMessage("Đã hủy kỳ đối soát.");
      await reloadList();
      await loadDetail(selectedId);
    } finally {
      setPending(false);
    }
  };

  const displayAllocations = useMemo(
    () => previewAllocations ?? detail?.allocations ?? [],
    [previewAllocations, detail?.allocations]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-white">Đối soát doanh thu quảng cáo theo tháng</h1>
        <AdminAdsMonetizationSectionNav />
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90">
          {DISCLAIMER}
        </p>
      </header>

      {message ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-white">Danh sách tháng</h2>
            {canUpdate ? (
              <Button type="button" variant="secondary" onClick={() => setCreateOpen((v) => !v)}>
                {createOpen ? "Đóng" : "+ Tạo kỳ"}
              </Button>
            ) : null}
          </div>

          {createOpen && canUpdate ? (
            <div className="space-y-2 rounded-xl border border-dashed border-white/15 p-3">
              <Input
                placeholder="YYYY-MM"
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Gross đối tác (VND)"
                value={form.gross_partner_revenue_vnd}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    gross_partner_revenue_vnd: Number(e.target.value) || 0
                  }))
                }
              />
              <Button type="button" disabled={pending} onClick={() => void createPeriod()}>
                Tạo kỳ
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-2 py-2">Tháng</th>
                  <th className="px-2 py-2">Gross</th>
                  <th className="px-2 py-2">Net</th>
                  <th className="px-2 py-2">Pool</th>
                  <th className="px-2 py-2">TT</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-b border-white/5 ${
                      selectedId === row.id ? "bg-cyan-500/10" : ""
                    }`}
                    onClick={() => void selectPeriod(row.id)}
                  >
                    <td className="px-2 py-2 text-zinc-200">{row.month}</td>
                    <td className="px-2 py-2 text-zinc-400">
                      {formatVnd(row.gross_partner_revenue_vnd)}
                    </td>
                    <td className="px-2 py-2 text-zinc-400">
                      {formatVnd(row.net_valid_revenue_vnd)}
                    </td>
                    <td className="px-2 py-2 text-zinc-400">{formatVnd(row.creator_pool_vnd)}</td>
                    <td className="px-2 py-2 text-xs text-zinc-500">
                      {AD_REVENUE_RECONCILIATION_STATUS_LABELS[row.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 ? (
              <p className="p-3 text-sm text-zinc-500">Chưa có kỳ đối soát.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          {!detail ? (
            <p className="text-sm text-zinc-500">Chọn một tháng để chỉnh sửa hoặc tạo kỳ mới.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-white">
                  Kỳ {detail.month}{" "}
                  <span className="text-sm font-normal text-zinc-500">
                    ({AD_REVENUE_RECONCILIATION_STATUS_LABELS[detail.status]})
                  </span>
                </h2>
                <p className="text-xs text-zinc-500">
                  Snapshot pool {detail.creator_pool_percent}% · reserve {detail.reserve_percent}% ·
                  giữ {detail.reserve_hold_days} ngày
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["gross_partner_revenue_vnd", "Gross đối tác (VND)"],
                    ["invalid_traffic_adjustment_vnd", "Trừ invalid traffic"],
                    ["refund_adjustment_vnd", "Trừ hoàn tiền"],
                    ["tax_fee_adjustment_vnd", "Trừ thuế/phí"],
                    ["other_adjustment_vnd", "Điều chỉnh khác"]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm text-zinc-400">
                    {label}
                    <Input
                      type="number"
                      className="mt-1"
                      disabled={readOnly}
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 }))
                      }
                    />
                  </label>
                ))}
                <label className="text-sm text-zinc-400 sm:col-span-2">
                  Ghi chú
                  <Input
                    className="mt-1"
                    disabled={readOnly}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 text-sm rounded-xl border border-white/10 p-3">
                <div>
                  <span className="text-zinc-500">Net hợp lệ</span>
                  <p className="text-white">{formatVnd(detail.net_valid_revenue_vnd)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Creator pool</span>
                  <p className="text-white">{formatVnd(detail.creator_pool_vnd)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Distributable</span>
                  <p className="text-white">{formatVnd(detail.distributable_vnd)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Reserve tổng</span>
                  <p className="text-white">{formatVnd(detail.reserve_vnd)}</p>
                </div>
              </div>

              {canUpdate ? (
                <div className="flex flex-wrap gap-2">
                  {isDraft ? (
                    <>
                      <Button type="button" disabled={pending} onClick={() => void savePeriod()}>
                        Lưu kỳ
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => void runCalculate(true)}
                      >
                        Preview allocations
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => void runCalculate(false)}
                      >
                        Calculate allocations
                      </Button>
                      <Button type="button" disabled={pending} onClick={() => void lockPeriod()}>
                        Lock month
                      </Button>
                    </>
                  ) : null}
                  {detail.status === "locked" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => void markReconciled()}
                    >
                      Mark reconciled
                    </Button>
                  ) : null}
                  {detail.status !== "cancelled" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending || detail.status === "reconciled"}
                      onClick={() => void cancelPeriod()}
                    >
                      Cancel reconciliation
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-amber-300/90">Chế độ chỉ xem hoặc kỳ đã khóa.</p>
              )}

              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">
                  Phân bổ theo tác giả
                  {previewAllocations ? " (preview)" : ""}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/10 max-h-96 overflow-y-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 border-b border-white/10 bg-zinc-900 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-2 py-2">Tác giả</th>
                        <th className="px-2 py-2">Impr.</th>
                        <th className="px-2 py-2">%</th>
                        <th className="px-2 py-2">Gross alloc.</th>
                        <th className="px-2 py-2">Reserve</th>
                        <th className="px-2 py-2">Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayAllocations.map((a) => (
                        <tr key={a.id} className="border-b border-white/5 text-zinc-300">
                          <td className="px-2 py-2">
                            @{a.username ?? a.author_id.slice(0, 8)}
                          </td>
                          <td className="px-2 py-2">{a.contribution_impressions}</td>
                          <td className="px-2 py-2">{formatPercent(a.contribution_percent)}</td>
                          <td className="px-2 py-2">{formatVnd(a.gross_allocated_vnd)}</td>
                          <td className="px-2 py-2">{formatVnd(a.reserve_hold_vnd)}</td>
                          <td className="px-2 py-2">{formatVnd(a.final_payable_vnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {displayAllocations.length === 0 ? (
                    <p className="p-3 text-sm text-zinc-500">
                      Chưa có phân bổ. Chạy Calculate sau khi có ad_monthly_author_stats.
                    </p>
                  ) : null}
                </div>
                {detail.allocationSummary ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Tổng score: {detail.allocationSummary.totalContributionScore} · Tổng %:{" "}
                    {formatPercent(detail.allocationSummary.totalContributionPercent)}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
