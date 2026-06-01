"use client";

import {
  TAXONOMY_ADMIN_SEGMENTS,
  type TaxonomyAdminTabId
} from "@/lib/taxonomy/admin-tabs";

type TaxonomySegmentNavProps = {
  active: TaxonomyAdminTabId | null;
  pendingRequests: number;
  qualityAlerts?: number;
  disabled?: boolean;
  onChange: (tab: TaxonomyAdminTabId) => void;
};

export function TaxonomySegmentNav({
  active,
  pendingRequests,
  qualityAlerts = 0,
  disabled,
  onChange
}: TaxonomySegmentNavProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-1">
      <div className="flex flex-wrap gap-1">
        {TAXONOMY_ADMIN_SEGMENTS.map((segment) => {
          const isActive = active === segment.id;
          let badge: number | null = null;
          if (segment.id === "requests" && pendingRequests > 0) {
            badge = pendingRequests;
          }
          if (segment.id === "quality" && qualityAlerts > 0) {
            badge = qualityAlerts;
          }

          return (
            <button
              className={`tap-highlight flex-1 min-w-[120px] rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-100 shadow-sm ring-1 ring-cyan-300/30"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
              disabled={disabled}
              key={segment.id}
              onClick={() => onChange(segment.id)}
              title={segment.description}
              type="button"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                {segment.label}
                {badge !== null ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      segment.id === "quality"
                        ? "bg-red-400/20 text-red-200"
                        : "bg-amber-400/20 text-amber-200"
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
