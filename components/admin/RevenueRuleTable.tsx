"use client";

import { Button } from "@/components/ui";
import {
  getEffectiveShareForSource,
  REVENUE_SOURCE_DEFINITIONS,
  type RevenueSourceDefinition
} from "@/lib/admin/monetization";
import type { MonetizationSettingsMap } from "@/types/monetization";

type RevenueRuleTableProps = {
  settings: MonetizationSettingsMap;
  canEdit: boolean;
  onSetCustom: (source: RevenueSourceDefinition) => void;
  onResetDefault: (source: RevenueSourceDefinition) => void;
};

export function RevenueRuleTable({
  settings,
  canEdit,
  onSetCustom,
  onResetDefault
}: RevenueRuleTableProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {REVENUE_SOURCE_DEFINITIONS.map((source) => {
        const share = getEffectiveShareForSource(settings, source);
        const enabled = Boolean(settings[source.enabledKey]);
        const isFuture = source.isFuture;
        const sumInvalid =
          !isFuture &&
          !share.usesDefault &&
          share.creator + share.platform !== 100;

        return (
          <div
            key={source.id}
            className={`flex flex-col rounded-xl border p-4 ${
              isFuture
                ? "border-white/5 opacity-55"
                : sumInvalid
                  ? "border-red-500/30 bg-red-500/[0.04]"
                  : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-white">{source.label}</p>
              {isFuture ? (
                <span className="shrink-0 rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-400">
                  Sắp có
                </span>
              ) : (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                    enabled
                      ? "border-cyan-400/30 text-cyan-200"
                      : "border-zinc-600 text-zinc-500"
                  }`}
                >
                  {enabled ? "Bật" : "Tắt"}
                </span>
              )}
            </div>

            {!isFuture ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">% tác giả</p>
                    <p className="font-medium text-zinc-200">{share.creator}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">% nền tảng</p>
                    <p className="font-medium text-zinc-200">{share.platform}%</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Chia sẻ:{" "}
                  {share.usesDefault ? (
                    <span className="text-zinc-400">Mặc định</span>
                  ) : (
                    <span className="text-cyan-300">Tùy chỉnh riêng</span>
                  )}
                </p>
                {sumInvalid ? (
                  <p className="mt-1 text-xs text-red-400">
                    Tổng % phải bằng 100.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    className="min-w-[7.5rem] whitespace-nowrap"
                    disabled={!canEdit}
                    onClick={() => onSetCustom(source)}
                    type="button"
                    variant="secondary"
                  >
                    Đặt tùy chỉnh
                  </Button>
                  <Button
                    className="min-w-[7.5rem] whitespace-nowrap"
                    disabled={!canEdit || share.usesDefault}
                    onClick={() => onResetDefault(source)}
                    type="button"
                    variant="secondary"
                  >
                    Đặt lại mặc định
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function RevenueSourceCustomEditor({
  source,
  settings,
  onChange,
  onClose
}: {
  source: RevenueSourceDefinition;
  settings: MonetizationSettingsMap;
  onChange: (key: import("@/types/monetization").MonetizationConfigKey, value: number) => void;
  onClose: () => void;
}) {
  const creator = Number(settings[source.creatorPercentKey]) || 0;
  const platform = Number(settings[source.platformPercentKey]) || 0;

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <p className="text-sm font-semibold text-white">
        Tùy chỉnh riêng: {source.label}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-400">% tác giả</span>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
            type="number"
            min={0}
            max={100}
            value={creator}
            onChange={(e) => {
              const c = Number(e.target.value);
              onChange(source.creatorPercentKey, c);
              onChange(source.platformPercentKey, Math.max(0, 100 - c));
            }}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">% nền tảng</span>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
            type="number"
            min={0}
            max={100}
            value={platform}
            onChange={(e) => {
              const p = Number(e.target.value);
              onChange(source.platformPercentKey, p);
              onChange(source.creatorPercentKey, Math.max(0, 100 - p));
            }}
          />
        </label>
      </div>
      <Button className="mt-3" onClick={onClose} type="button" variant="secondary">
        Đóng
      </Button>
    </div>
  );
}
