"use client";

import { Card } from "@/components/ui";
import { PlacementMiniPreview } from "@/components/admin/campaigns/CampaignPreview";
import {
  FUTURE_CAMPAIGN_TYPES,
  PLACEMENT_DEFINITIONS,
  getCampaignTypeLabel
} from "@/lib/campaigns/constants";

const AVAILABILITY_LABEL = {
  available: { text: "Khả dụng", className: "border-emerald-500/40 text-emerald-200" },
  coming_soon: { text: "Sắp ra mắt", className: "border-blue-500/40 text-blue-200" },
  disabled: { text: "Tắt", className: "border-zinc-600 text-zinc-500" }
};

export function PlacementsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white">Vị trí hiển thị trong app</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Xem trước cách campaign xuất hiện với người dùng theo từng placement.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLACEMENT_DEFINITIONS.map((placement) => {
          const avail = AVAILABILITY_LABEL[placement.availability];
          return (
            <Card className="flex flex-col gap-3 p-4" key={placement.id}>
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-white">{placement.name}</h4>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${avail.className}`}>
                  {avail.text}
                </span>
              </div>
              <p className="text-sm text-zinc-400">{placement.description}</p>
              {placement.campaignTypes.length > 0 ? (
                <p className="text-xs text-zinc-500">
                  Loại phù hợp:{" "}
                  {placement.campaignTypes.map((t) => getCampaignTypeLabel(t)).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-zinc-600">Chưa gán loại campaign</p>
              )}
              <PlacementMiniPreview placementId={placement.id} />
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-400">Loại campaign tương lai</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {FUTURE_CAMPAIGN_TYPES.map((type) => (
            <Card className="border-dashed p-3 opacity-60" key={type.id}>
              <p className="font-medium text-zinc-400">{type.label}</p>
              <p className="mt-1 text-xs text-zinc-600">{type.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
