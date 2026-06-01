"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AdminAdsPlacementDrawer } from "@/components/admin/ads/AdminAdsPlacementDrawer";
import { AdminAdsPlacementPreview } from "@/components/admin/ads/AdminAdsPlacementPreview";
import { AdminAdsPlacementTable } from "@/components/admin/ads/AdminAdsPlacementTable";
import { AdminAdsMonetizationSectionNav } from "@/components/admin/ads/AdminAdsMonetizationSectionNav";
import { rowToForm } from "@/components/admin/ads/admin-ads-form-defaults";
import { formatVnd } from "@/components/admin/ads/placement-ui-helpers";
import { Button } from "@/components/ui";
import {
  AD_DEVICE_OPTIONS,
  AD_FORMAT_OPTIONS,
  AD_PLACEMENT_PRESET_SUGGESTIONS,
  AD_SURFACE_OPTIONS,
  type AdPlacementListFilters,
  type AdPlacementListItem,
  type AdPlacementRevenuePrep,
  type AdPlacementRow,
  type AdPlacementStats
} from "@/types/ads";

type HubTab = "overview" | "placements" | "audit";

type AdminAdsHubProps = {
  initialItems: AdPlacementListItem[];
  initialTotal: number;
  initialStats: AdPlacementStats;
  initialRevenuePrep: AdPlacementRevenuePrep;
  initialFilters: AdPlacementListFilters;
  loadError: string | null;
  canEdit: boolean;
};

export function AdminAdsHub({
  initialItems,
  initialTotal,
  initialStats,
  initialRevenuePrep,
  initialFilters,
  loadError,
  canEdit
}: AdminAdsHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<HubTab>("overview");
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [revenuePrep] = useState(initialRevenuePrep);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdPlacementRow | null>(null);
  const [previewItem, setPreviewItem] = useState<AdPlacementListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    { id: string; action: string; created_at: string; metadata?: Record<string, unknown> }[]
  >([]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / (filters.pageSize ?? 20))),
    [total, filters.pageSize]
  );

  const buildParams = useCallback((f: AdPlacementListFilters) => {
    const params = new URLSearchParams();
    if (f.surface) params.set("surface", f.surface);
    if (f.device) params.set("device", f.device);
    if (f.enabled && f.enabled !== "all") params.set("enabled", f.enabled);
    if (f.testMode && f.testMode !== "all") params.set("testMode", f.testMode);
    if (f.mode && f.mode !== "all") params.set("mode", f.mode);
    if (f.adFormat) params.set("adFormat", f.adFormat);
    if (f.risk && f.risk !== "all") params.set("risk", f.risk);
    if (f.search) params.set("q", f.search);
    if (f.page && f.page > 1) params.set("page", String(f.page));
    return params;
  }, []);

  const refreshList = useCallback(async () => {
    const params = buildParams(filters);
    const [listRes, statsRes] = await Promise.all([
      fetch(`/api/admin/ads/placements?${params}`),
      fetch("/api/admin/ads/stats")
    ]);
    const listJson = (await listRes.json()) as { items?: AdPlacementListItem[]; total?: number };
    const statsJson = (await statsRes.json()) as { stats?: AdPlacementStats };
    if (listJson.items) setItems(listJson.items);
    if (listJson.total != null) setTotal(listJson.total);
    if (statsJson.stats) setStats(statsJson.stats);
  }, [filters, buildParams]);

  const applyFilters = () => {
    const next = { ...draftFilters, page: 1 };
    setFilters(next);
    router.push(`/admin/ads?${buildParams(next).toString()}`);
  };

  const resetFilters = () => {
    const next: AdPlacementListFilters = { page: 1, pageSize: 20 };
    setDraftFilters(next);
    setFilters(next);
    router.push("/admin/ads");
  };

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/admin/ads/audit?limit=40");
    const json = (await res.json()) as { logs?: typeof auditLogs };
    setAuditLogs(json.logs ?? []);
  }, []);

  const kpiCards = [
    { label: "Tổng placement", value: stats.totalPlacements },
    { label: "Đang bật", value: stats.enabledCount },
    { label: "Test mode", value: stats.testModeCount },
    { label: "Render hôm nay", value: stats.renderedToday, hint: stats.statsAvailable ? undefined : "từ sự kiện" },
    { label: "Impression hôm nay", value: stats.impressionsToday, empty: !stats.statsAvailable },
    { label: "Click hôm nay", value: stats.clicksToday, empty: !stats.statsAvailable },
    {
      label: "Doanh thu ước tính hôm nay",
      value: stats.statsAvailable ? formatVnd(stats.estimatedRevenueToday) : "—",
      empty: !stats.statsAvailable
    },
    { label: "Có cảnh báo", value: stats.warningPlacementCount }
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <nav className="text-xs text-zinc-500">
          <Link className="hover:text-cyan-300" href="/admin">
            Admin
          </Link>
          <span className="mx-1.5">/</span>
          <Link className="hover:text-cyan-300" href="/admin/monetization-settings">
            Tài chính
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-zinc-300">Quảng cáo</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Quảng cáo</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Quản lý vị trí hiển thị, AdSense slot, test mode và hiệu suất quảng cáo toàn hệ thống.
              Frontend chỉ đọc cấu hình từ database — không hard-code placement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setDrawerOpen(true);
                }}
                type="button"
              >
                + Tạo placement
              </Button>
            ) : null}
            <Button onClick={() => { router.refresh(); void refreshList(); }} type="button" variant="secondary">
              Đồng bộ cấu hình
            </Button>
            <button
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm text-zinc-300 hover:bg-white/5"
              onClick={() => {
                setTab("audit");
                void loadAudit();
              }}
              type="button"
            >
              Audit trải nghiệm
            </button>
          </div>
        </div>

        <AdminAdsMonetizationSectionNav />

        <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {(
            [
              ["overview", "Tổng quan"],
              ["placements", "Placements"],
              ["audit", "Audit logs"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                tab === id
                  ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/35"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
              onClick={() => {
                setTab(id);
                if (id === "audit") void loadAudit();
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
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

      {(tab === "overview" || tab === "placements") && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              key={card.label}
            >
              <p className="text-xs text-zinc-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {"empty" in card && card.empty ? (
                  <span className="text-base text-zinc-600">Chưa có dữ liệu</span>
                ) : (
                  card.value
                )}
              </p>
              {"hint" in card && card.hint ? (
                <p className="mt-1 text-[10px] text-zinc-600">Nguồn: {card.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="text-sm font-semibold text-white">Khuyến nghị vận hành</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
              <li>• Không bật live khi chưa được Google AdSense duyệt.</li>
              <li>• Ưu tiên cuối chương và sidebar desktop trước.</li>
              <li>• Hạn chế quảng cáo giữa chương trên mobile.</li>
              <li>• Reels ads mặc định tắt — chỉ bật khi chủ động thử nghiệm.</li>
              <li>• Không hiển thị trên nội dung nhạy cảm chưa kiểm duyệt kỹ.</li>
              <li>• Số liệu dashboard là ước tính, không phải đối soát cuối.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
            <h2 className="text-sm font-semibold text-violet-100">Chuẩn bị chia doanh thu</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">Ước tính tháng này</dt>
                <dd className="text-white">
                  {revenuePrep.statsAvailable
                    ? formatVnd(revenuePrep.monthEstimatedRevenueVnd)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">Placement revenue eligible</dt>
                <dd className="text-white">{revenuePrep.revenueEligibleCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">Platform-only</dt>
                <dd className="text-white">{revenuePrep.platformOnlyCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">Gán tác giả</dt>
                <dd className="text-white">{revenuePrep.authorAttributedCount}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Doanh thu quảng cáo hiển thị tại đây là số ước tính. Doanh thu chia cho tác giả chỉ được
              tính sau đối soát, trừ invalid traffic, điều chỉnh, thuế/phí và các khoản giữ lại theo
              cấu hình kiếm tiền.
            </p>
            <p className="mt-2 text-xs text-amber-200/80">
              Invalid traffic có thể bị hold theo cấu hình đối soát / fraud.
            </p>
            <Link
              className="mt-3 inline-block text-sm font-semibold text-cyan-300"
              href="/admin/monetization-settings"
            >
              Cấu hình kiếm tiền & ads →
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "placements" ? (
        <>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Surface"
                value={draftFilters.surface ?? ""}
                onChange={(v) => setDraftFilters({ ...draftFilters, surface: v || undefined })}
                options={[{ value: "", label: "Tất cả" }, ...AD_SURFACE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
              />
              <FilterSelect
                label="Thiết bị"
                value={draftFilters.device ?? ""}
                onChange={(v) =>
                  setDraftFilters({
                    ...draftFilters,
                    device: (v as AdPlacementListFilters["device"]) || undefined
                  })
                }
                options={[{ value: "", label: "Tất cả" }, ...AD_DEVICE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
              />
              <FilterSelect
                label="Trạng thái"
                value={draftFilters.enabled ?? "all"}
                onChange={(v) =>
                  setDraftFilters({
                    ...draftFilters,
                    enabled: v as AdPlacementListFilters["enabled"]
                  })
                }
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "yes", label: "Đang bật" },
                  { value: "no", label: "Đang tắt" }
                ]}
              />
              <FilterSelect
                label="Mode"
                value={draftFilters.mode ?? "all"}
                onChange={(v) =>
                  setDraftFilters({ ...draftFilters, mode: v as AdPlacementListFilters["mode"] })
                }
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "live", label: "Live" },
                  { value: "test", label: "Test" }
                ]}
              />
              <FilterSelect
                label="Format"
                value={draftFilters.adFormat ?? ""}
                onChange={(v) =>
                  setDraftFilters({
                    ...draftFilters,
                    adFormat: (v as AdPlacementListFilters["adFormat"]) || undefined
                  })
                }
                options={[{ value: "", label: "Tất cả" }, ...AD_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
              />
              <FilterSelect
                label="Rủi ro"
                value={draftFilters.risk ?? "all"}
                onChange={(v) =>
                  setDraftFilters({ ...draftFilters, risk: v as AdPlacementListFilters["risk"] })
                }
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "ok", label: "Ổn" },
                  { value: "warning", label: "Cảnh báo" },
                  { value: "blocked", label: "Chặn" }
                ]}
              />
              <label className="text-xs text-zinc-500">
                Tìm kiếm
                <input
                  className="mt-1 block w-40 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                  value={draftFilters.search ?? ""}
                  onChange={(e) => setDraftFilters({ ...draftFilters, search: e.target.value })}
                  placeholder="key, tên…"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={applyFilters} type="button" variant="secondary">
                Áp dụng
              </Button>
              <Button onClick={resetFilters} type="button" variant="secondary">
                Reset
              </Button>
              <button
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
                disabled
                title="Sẽ bổ sung sau"
                type="button"
              >
                Export CSV
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
              <p className="text-lg font-medium text-zinc-300">
                Chưa có placement quảng cáo phù hợp bộ lọc.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Tạo mới hoặc reset bộ lọc. Các preset chuẩn đã được seed (tắt, test mode).
              </p>
              {canEdit ? (
                <Button
                  className="mt-6"
                  onClick={() => {
                    setEditing(null);
                    setDrawerOpen(true);
                  }}
                  type="button"
                >
                  Tạo placement đầu tiên
                </Button>
              ) : null}
              <ul className="mx-auto mt-8 max-w-md space-y-1 text-left text-sm text-zinc-500">
                {AD_PLACEMENT_PRESET_SUGGESTIONS.map((p) => (
                  <li key={p.key}>• {p.name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <AdminAdsPlacementTable
              canEdit={canEdit}
              items={items}
              onEdit={(item) => {
                setEditing(item);
                setDrawerOpen(true);
              }}
              onPreview={setPreviewItem}
              onRefresh={() => void refreshList()}
            />
          )}

          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              Trang {filters.page ?? 1} / {totalPages} · {total} placement
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => {
                  const next = { ...filters, page: Math.max(1, (filters.page ?? 1) - 1) };
                  setFilters(next);
                  router.push(`/admin/ads?${buildParams(next)}`);
                }}
                type="button"
              >
                Trước
              </button>
              <button
                className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => {
                  const next = { ...filters, page: (filters.page ?? 1) + 1 };
                  setFilters(next);
                  router.push(`/admin/ads?${buildParams(next)}`);
                }}
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      ) : null}

      {tab === "audit" ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Nhật ký placement</h2>
          {auditLogs.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Chưa có thay đổi được ghi nhận.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {auditLogs.map((log) => (
                <li
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                  key={log.id}
                >
                  <div className="flex justify-between gap-2 text-xs text-zinc-500">
                    <span>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                    <span className="font-mono text-cyan-300/80">{log.action}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {previewItem ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Preview · {previewItem.name}</h2>
              <button
                className="text-sm text-zinc-400"
                onClick={() => setPreviewItem(null)}
                type="button"
              >
                Đóng
              </button>
            </div>
            <AdminAdsPlacementPreview form={rowToForm(previewItem)} variant="mobile" />
          </div>
        </div>
      ) : null}

      <AdminAdsPlacementDrawer
        canEdit={canEdit}
        editing={editing}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setMessage("Đã lưu placement.");
          void refreshList();
        }}
      />
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-xs text-zinc-500">
      {label}
      <select
        className="mt-1 block rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={`${o.value}-${o.label}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
