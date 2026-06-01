"use client";

import { useState } from "react";
import { placementWarnings } from "@/lib/ads/admin-placement-warnings";
import { maskAdSenseClient } from "@/lib/ads/validate-placement-form";
import {
  formatSizeLabel,
  formatVnd,
  RiskBadge,
  StatusBadges
} from "@/components/admin/ads/placement-ui-helpers";
import type { AdPlacementListItem } from "@/types/ads";

type AdminAdsPlacementTableProps = {
  items: AdPlacementListItem[];
  canEdit: boolean;
  onPreview: (item: AdPlacementListItem) => void;
  onEdit: (item: AdPlacementListItem) => void;
  onRefresh: () => void;
};

export function AdminAdsPlacementTable({
  items,
  canEdit,
  onPreview,
  onEdit,
  onRefresh
}: AdminAdsPlacementTableProps) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setPendingId(id);
    try {
      await fn();
      onRefresh();
    } finally {
      setPendingId(null);
      setMenuId(null);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Placement</th>
              <th className="px-3 py-3">Surface</th>
              <th className="px-3 py-3">Device</th>
              <th className="px-3 py-3">Format</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">AdSense</th>
              <th className="px-3 py-3">UX</th>
              <th className="px-3 py-3">Hiệu suất hôm nay</th>
              <th className="px-3 py-3">Rủi ro</th>
              <th className="px-3 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const warnings = placementWarnings(item, items);
              const stats = item.stats_today;
              return (
                <tr className="border-b border-white/5 align-top" key={item.id}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">{item.placement_key}</p>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.description}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-300">{item.surface}</td>
                  <td className="px-3 py-3 text-zinc-300">{item.device}</td>
                  <td className="px-3 py-3 text-zinc-300">{formatSizeLabel(item)}</td>
                  <td className="px-3 py-3">
                    <StatusBadges item={item} />
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-400">
                    <div>{maskAdSenseClient(item.adsense_client_id)}</div>
                    <div className="mt-0.5">{item.adsense_slot_id ?? "—"}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-500">
                    gap {item.min_content_gap} · max {item.max_per_page}/trang
                    {item.lazy_load ? " · lazy" : ""}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-400">
                    {stats ? (
                      <>
                        <div>{stats.renders} render</div>
                        <div>{stats.impressions} imp · CTR {stats.ctr.toFixed(2)}%</div>
                        <div className="text-cyan-300/80">{formatVnd(stats.estimated_revenue)}</div>
                      </>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <RiskBadge level={item.risk_level} />
                    {warnings[0] ? (
                      <p className="mt-1 max-w-[140px] text-[10px] leading-snug text-amber-300/80">
                        {warnings[0]}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <PlacementActions
                      canEdit={canEdit}
                      item={item}
                      menuId={menuId}
                      pendingId={pendingId}
                      setMenuId={setMenuId}
                      onEdit={onEdit}
                      onPreview={onPreview}
                      runAction={runAction}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {items.map((item) => (
          <li
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            key={item.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{item.name}</p>
                <p className="font-mono text-xs text-zinc-500">{item.placement_key}</p>
              </div>
              <RiskBadge level={item.risk_level} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
              <span>{item.surface}</span>
              <span>·</span>
              <span>{item.device}</span>
              <span>·</span>
              <span>{formatSizeLabel(item)}</span>
            </div>
            <div className="mt-2">
              <StatusBadges item={item} />
            </div>
            <div className="mt-3 flex justify-end">
              <PlacementActions
                canEdit={canEdit}
                item={item}
                menuId={menuId}
                pendingId={pendingId}
                setMenuId={setMenuId}
                onEdit={onEdit}
                onPreview={onPreview}
                runAction={runAction}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function PlacementActions({
  item,
  canEdit,
  menuId,
  setMenuId,
  pendingId,
  onPreview,
  onEdit,
  runAction
}: {
  item: AdPlacementListItem;
  canEdit: boolean;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  pendingId: string | null;
  onPreview: (item: AdPlacementListItem) => void;
  onEdit: (item: AdPlacementListItem) => void;
  runAction: (id: string, fn: () => Promise<void>) => Promise<void>;
}) {
  const open = menuId === item.id;
  const busy = pendingId === item.id;

  return (
    <div className="relative inline-block text-left">
      <button
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        disabled={busy}
        onClick={() => setMenuId(open ? null : item.id)}
        type="button"
      >
        {busy ? "…" : "Thao tác ▾"}
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl">
          <MenuBtn onClick={() => { setMenuId(null); onPreview(item); }}>Xem trước</MenuBtn>
          <MenuBtn onClick={() => { setMenuId(null); onEdit(item); }}>Sửa</MenuBtn>
          {canEdit ? (
            <>
              <MenuBtn
                onClick={() =>
                  void runAction(item.id, async () => {
                    await fetch(`/api/admin/ads/placements/${item.id}/duplicate`, { method: "POST" });
                  })
                }
              >
                Nhân bản
              </MenuBtn>
              <MenuBtn
                onClick={() =>
                  void runAction(item.id, async () => {
                    await fetch(`/api/admin/ads/placements/${item.id}/toggle`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isEnabled: !item.is_enabled })
                    });
                  })
                }
              >
                {item.is_enabled ? "Tắt" : "Bật"}
              </MenuBtn>
              <MenuBtn
                onClick={() =>
                  void runAction(item.id, async () => {
                    await fetch(`/api/admin/ads/placements/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ is_test_mode: !item.is_test_mode })
                    });
                  })
                }
              >
                {item.is_test_mode ? "Chuyển Live" : "Chuyển Test"}
              </MenuBtn>
              <MenuBtn
                onClick={() => {
                  if (!confirm("Lưu trữ placement này? (không xóa cứng nếu có thống kê)")) return;
                  void runAction(item.id, async () => {
                    await fetch(`/api/admin/ads/placements/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ archive: true })
                    });
                  });
                }}
              >
                Lưu trữ
              </MenuBtn>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
