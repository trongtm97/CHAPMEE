"use client";

import { useMemo, useState } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { Button, EmptyState } from "@/components/ui";
import { updateCampaignStatusAction, INITIAL_CAMPAIGN_ACTION_STATE } from "@/lib/admin/campaign-actions";
import {
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_DEFINITIONS,
  getCampaignTypeLabel,
  getPlacementLabel
} from "@/lib/campaigns/constants";
import type { CampaignStaffPermissions, CampaignStatus, CampaignWithSponsor } from "@/types/campaign";
import { useActionState } from "react";

type CampaignListTabProps = {
  campaigns: CampaignWithSponsor[];
  permissions: CampaignStaffPermissions;
  onCreate: () => void;
  onEdit: (campaign: CampaignWithSponsor) => void;
  initialFilter?: CampaignStatus | "all";
};

export function CampaignListTab({
  campaigns,
  permissions,
  onCreate,
  onEdit,
  initialFilter = "all"
}: CampaignListTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sponsorFilter, setSponsorFilter] = useState<string>("all");
  const [confirm, setConfirm] = useState<{
    campaignId: string;
    status: CampaignStatus;
    title: string;
    description: string;
  } | null>(null);
  const [statusState, statusAction, statusPending] = useActionState(
    updateCampaignStatusAction,
    INITIAL_CAMPAIGN_ACTION_STATE
  );

  const sponsors = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of campaigns) {
      if (c.sponsor) map.set(c.sponsor.id, c.sponsor.name);
    }
    return [...map.entries()];
  }, [campaigns]);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.campaignType !== typeFilter) return false;
      if (sponsorFilter !== "all" && c.sponsorId !== sponsorFilter) return false;
      return true;
    });
  }, [campaigns, statusFilter, typeFilter, sponsorFilter]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("vi-VN");
  };

  const formatVnd = (n: number | null) =>
    permissions.canViewFinance && n !== null ? n.toLocaleString("vi-VN") : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => setTypeFilter(e.target.value)}
            value={typeFilter}
          >
            <option value="all">Tất cả loại</option>
            {CAMPAIGN_TYPE_DEFINITIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => setSponsorFilter(e.target.value)}
            value={sponsorFilter}
          >
            <option value="all">Tất cả sponsor</option>
            {sponsors.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {permissions.canCreate ? (
          <Button onClick={onCreate} type="button">
            + Tạo campaign
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          action={
            permissions.canCreate ? (
              <Button onClick={onCreate} type="button">
                Tạo campaign đầu tiên
              </Button>
            ) : undefined
          }
          description="Tạo campaign đầu tiên để tài trợ challenge, banner hoặc native card trong app."
          title="Chưa có campaign"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Sponsor</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Placement</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign) => (
                <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={campaign.id}>
                  <td className="px-4 py-3 font-medium text-white">{campaign.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{campaign.sponsor?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{getCampaignTypeLabel(campaign.campaignType)}</td>
                  <td className="px-4 py-3 text-zinc-400">{getPlacementLabel(campaign.placement)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${CAMPAIGN_STATUS_COLORS[campaign.status]}`}
                    >
                      {CAMPAIGN_STATUS_LABELS[campaign.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatVnd(campaign.budgetVnd)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatVnd(campaign.revenueVnd)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button className="!min-h-8 !px-2 !text-[10px]" onClick={() => onEdit(campaign)} type="button" variant="ghost">
                        Xem/Sửa
                      </Button>
                      {permissions.canPause && campaign.status === "active" ? (
                        <Button
                          className="!min-h-8 !px-2 !text-[10px]"
                          onClick={() =>
                            setConfirm({
                              campaignId: campaign.id,
                              status: "paused",
                              title: "Tạm dừng campaign?",
                              description: `Campaign "${campaign.name}" sẽ ẩn khỏi app cho đến khi được kích hoạt lại.`
                            })
                          }
                          type="button"
                          variant="secondary"
                        >
                          Pause
                        </Button>
                      ) : null}
                      {permissions.canPause && campaign.status !== "ended" && campaign.status !== "archived" ? (
                        <Button
                          className="!min-h-8 !px-2 !text-[10px]"
                          onClick={() =>
                            setConfirm({
                              campaignId: campaign.id,
                              status: "ended",
                              title: "Kết thúc campaign?",
                              description: `Campaign "${campaign.name}" sẽ không còn hiển thị public.`
                            })
                          }
                          type="button"
                          variant="secondary"
                        >
                          End
                        </Button>
                      ) : null}
                      {permissions.canArchive && campaign.status !== "archived" ? (
                        <Button
                          className="!min-h-8 !px-2 !text-[10px]"
                          onClick={() =>
                            setConfirm({
                              campaignId: campaign.id,
                              status: "archived",
                              title: "Lưu trữ campaign?",
                              description: `Campaign "${campaign.name}" sẽ được chuyển sang trạng thái lưu trữ.`
                            })
                          }
                          type="button"
                          variant="ghost"
                        >
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statusState.message ? (
        <p className={`text-sm ${statusState.ok ? "text-emerald-300" : "text-red-300"}`}>
          {statusState.message}
        </p>
      ) : null}

      <ConfirmActionModal
        confirmLabel="Xác nhận"
        description={confirm?.description ?? ""}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          const fd = new FormData();
          fd.set("campaignId", confirm.campaignId);
          fd.set("status", confirm.status);
          statusAction(fd);
          setConfirm(null);
        }}
        open={Boolean(confirm)}
        pending={statusPending}
        title={confirm?.title ?? ""}
      />
    </div>
  );
}
