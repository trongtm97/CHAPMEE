"use client";

import { Button, EmptyState } from "@/components/ui";
import { SPONSOR_STATUS_LABELS } from "@/lib/campaigns/constants";
import type { CampaignStaffPermissions, SponsorWithStats } from "@/types/campaign";

type SponsorListTabProps = {
  sponsors: SponsorWithStats[];
  permissions: CampaignStaffPermissions;
  onCreate: () => void;
  onEdit: (sponsor: SponsorWithStats) => void;
};

export function SponsorListTab({
  sponsors,
  permissions,
  onCreate,
  onEdit
}: SponsorListTabProps) {
  const formatVnd = (n: number) =>
    permissions.canViewFinance ? `${n.toLocaleString("vi-VN")} ₫` : "—";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {permissions.canManageSponsors ? (
          <Button onClick={onCreate} type="button">
            + Tạo sponsor
          </Button>
        ) : null}
      </div>

      {sponsors.length === 0 ? (
        <EmptyState
          action={
            permissions.canManageSponsors ? (
              <Button onClick={onCreate} type="button">
                Tạo sponsor đầu tiên
              </Button>
            ) : undefined
          }
          description="Thêm đối tác thương hiệu để gắn vào campaign tài trợ."
          title="Chưa có sponsor"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Sponsor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Campaigns</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sponsor) => (
                <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={sponsor.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {sponsor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-8 w-8 rounded-md object-cover" src={sponsor.logoUrl} />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-400">
                          {sponsor.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="font-medium text-white">{sponsor.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{sponsor.contactEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {SPONSOR_STATUS_LABELS[sponsor.status] ?? sponsor.status}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{sponsor.campaignCount}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatVnd(sponsor.totalRevenueVnd)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(sponsor.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    {permissions.canManageSponsors ? (
                      <Button
                        className="!min-h-8 !px-2 !text-[10px]"
                        onClick={() => onEdit(sponsor)}
                        type="button"
                        variant="ghost"
                      >
                        Sửa
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
