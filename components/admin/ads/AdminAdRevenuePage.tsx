"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AdminAdsMonetizationSectionNav } from "@/components/admin/ads/AdminAdsMonetizationSectionNav";
import type { AdRevenueAdminDashboard, AdRevenueEstimateSettings } from "@/types/ad-revenue";

const DISCLAIMER =
  "Số liệu này là ước tính nội bộ, không phải số tiền thanh toán cuối cùng.";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

type AdminAdRevenuePageProps = {
  initialSettings: AdRevenueEstimateSettings;
  initialDashboard: AdRevenueAdminDashboard;
  initialFilters: {
    from: string;
    to: string;
    month: string;
  };
  loadError: string | null;
};

export function AdminAdRevenuePage({
  initialDashboard,
  initialFilters,
  initialSettings,
  loadError
}: AdminAdRevenuePageProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [filters, setFilters] = useState(initialFilters);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshSummary = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.month) params.set("month", filters.month);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const res = await fetch(`/api/admin/ad-revenue/summary?${params}`);
    const json = (await res.json()) as {
      dashboard?: AdRevenueAdminDashboard;
      settings?: AdRevenueEstimateSettings;
      error?: string;
    };
    if (json.dashboard) setDashboard(json.dashboard);
    if (json.settings) setSettings(json.settings);
    return json.error ?? null;
  }, [filters]);

  const saveSettings = async () => {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ad-revenue/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const json = (await res.json()) as { error?: string; settings?: AdRevenueEstimateSettings };
      if (!res.ok) {
        setMessage(json.error ?? "Lưu cấu hình thất bại.");
        return;
      }
      if (json.settings) setSettings(json.settings);
      setMessage("Đã lưu cấu hình ước tính.");
      setSettingsOpen(false);
    } finally {
      setPending(false);
    }
  };

  const rebuildMetrics = async () => {
    if (!filters.from || !filters.to) {
      setMessage("Chọn khoảng ngày from/to để rebuild.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ad-revenue/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: filters.from, to: filters.to })
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        warnings?: string[];
        dailyRows?: number;
        monthlyUpserts?: number;
      };
      if (!res.ok || !json.ok) {
        setMessage(json.error ?? "Rebuild thất bại.");
        return;
      }
      const warn = json.warnings?.length ? ` ${json.warnings.join(" ")}` : "";
      setMessage(
        `Rebuild xong: ${json.dailyRows ?? 0} dòng daily, ${json.monthlyUpserts ?? 0} monthly.${warn}`
      );
      await refreshSummary();
    } finally {
      setPending(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (filters.month) params.set("month", filters.month);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    window.location.href = `/api/admin/ad-revenue/export?${params}`;
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Doanh thu quảng cáo (ước tính)</h1>
          <Link className="text-sm text-cyan-300 hover:underline" href="/admin/ads">
            ← Quản lý placement
          </Link>
        </div>
        <AdminAdsMonetizationSectionNav />
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90">
          {DISCLAIMER}
        </p>
      </header>

      {loadError ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
          onClick={() => setSettingsOpen((v) => !v)}
          type="button"
        >
          Cấu hình RPM & pool
        </button>
        <button
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          disabled={pending}
          onClick={() => void rebuildMetrics()}
          type="button"
        >
          Rebuild metrics
        </button>
        <button
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
          onClick={exportCsv}
          type="button"
        >
          Export CSV
        </button>
      </div>

      {settingsOpen ? (
        <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <SettingsField
            label="RPM mặc định (VND / 1000 impressions)"
            type="number"
            value={String(settings.default_rpm_vnd)}
            onChange={(v) => setSettings({ ...settings, default_rpm_vnd: Number(v) || 0 })}
          />
          <SettingsField
            label="Creator pool %"
            type="number"
            value={String(settings.creator_pool_percent)}
            onChange={(v) => setSettings({ ...settings, creator_pool_percent: Number(v) || 0 })}
          />
          <SettingsField
            label="Reserve %"
            type="number"
            value={String(settings.reserve_percent)}
            onChange={(v) => setSettings({ ...settings, reserve_percent: Number(v) || 0 })}
          />
          <SettingsField
            label="Reserve hold (ngày)"
            type="number"
            value={String(settings.reserve_hold_days)}
            onChange={(v) => setSettings({ ...settings, reserve_hold_days: Number(v) || 0 })}
          />
          <SettingsField
            label="Min payout (VND)"
            type="number"
            value={String(settings.min_payout_vnd)}
            onChange={(v) => setSettings({ ...settings, min_payout_vnd: Number(v) || 0 })}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
            <input
              checked={settings.is_creator_ads_revenue_enabled}
              onChange={(e) =>
                setSettings({ ...settings, is_creator_ads_revenue_enabled: e.target.checked })
              }
              type="checkbox"
            />
            Bật tính năng chia sẻ quảng cáo (tương lai)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
            <input
              checked={settings.is_estimate_visible_to_creators}
              onChange={(e) =>
                setSettings({ ...settings, is_estimate_visible_to_creators: e.target.checked })
              }
              type="checkbox"
            />
            Hiển thị ước tính cho tác giả trong Studio
          </label>
          <div className="sm:col-span-3">
            <button
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              disabled={pending}
              onClick={() => void saveSettings()}
              type="button"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <FilterField
          label="Từ ngày"
          type="date"
          value={filters.from}
          onChange={(v) => setFilters({ ...filters, from: v, month: "" })}
        />
        <FilterField
          label="Đến ngày"
          type="date"
          value={filters.to}
          onChange={(v) => setFilters({ ...filters, to: v, month: "" })}
        />
        <FilterField
          label="Tháng (YYYY-MM)"
          value={filters.month}
          onChange={(v) => setFilters({ ...filters, month: v })}
        />
        <button
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200"
          onClick={() => void refreshSummary()}
          type="button"
        >
          Áp dụng lọc
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Rendered impressions", value: formatNumber(dashboard.totalRenderedImpressions) },
          { label: "Gross ước tính", value: formatVnd(dashboard.estimatedGrossRevenueVnd) },
          { label: "Creator pool ước tính", value: formatVnd(dashboard.creatorPoolEstimateVnd) },
          { label: "Reserve hold ước tính", value: formatVnd(dashboard.reserveHoldEstimateVnd) },
          { label: "Invalid adjustment", value: formatVnd(dashboard.invalidAdjustmentVnd) }
        ].map((card) => (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            key={card.label}
          >
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable
          caption="Top tác giả (ước tính gross)"
          headers={["Tác giả", "Impressions", "Gross ước tính", "Payable ước tính"]}
          rows={dashboard.topAuthors.map((row) => [
            row.username ? `@${row.username}` : row.displayName ?? row.authorId.slice(0, 8),
            formatNumber(row.renderedImpressions),
            formatVnd(row.estimatedGrossRevenueVnd),
            formatVnd(row.estimatedPayableVnd)
          ])}
        />
        <RankingTable
          caption="Top truyện (impressions)"
          headers={["Truyện", "Impressions", "Gross ước tính"]}
          rows={dashboard.topStories.map((row) => [
            row.title ?? row.storyId.slice(0, 8),
            formatNumber(row.renderedImpressions),
            formatVnd(row.estimatedGrossRevenueVnd)
          ])}
        />
      </div>
    </section>
  );
}

function SettingsField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FilterField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-zinc-500">
      {label}
      <input
        className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function RankingTable({
  caption,
  headers,
  rows
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <p className="border-b border-white/10 px-4 py-2 text-sm font-semibold text-white">{caption}</p>
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-zinc-500">
          <tr>
            {headers.map((h) => (
              <th className="px-3 py-2" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-zinc-500" colSpan={headers.length}>
                Chưa có dữ liệu — chạy Rebuild metrics sau khi có ad_render_events.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr className="border-t border-white/5 text-zinc-200" key={`${i}-${row[0]}`}>
                {row.map((cell, j) => (
                  <td className="px-3 py-2" key={j}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
