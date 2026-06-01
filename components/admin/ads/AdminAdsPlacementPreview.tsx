"use client";

import type { AdPlacementFormInput } from "@/types/ads";

export function AdminAdsPlacementPreview({
  form,
  variant
}: {
  form: AdPlacementFormInput;
  variant: "mobile" | "desktop";
}) {
  const w = form.width ?? (variant === "mobile" ? 320 : 728);
  const h = form.height ?? (variant === "mobile" ? 50 : 90);
  const isResponsive = form.size_mode === "responsive" || form.size_mode === "fluid";

  return (
    <div
      className={`rounded-xl border border-white/10 bg-zinc-900/80 p-3 ${variant === "mobile" ? "max-w-[360px]" : "w-full"}`}
    >
      <p className="mb-2 text-xs font-medium text-zinc-500">
        Xem trước {variant === "mobile" ? "Mobile" : "Desktop"}
      </p>
      <div className="mx-auto space-y-2 rounded-lg bg-zinc-950 p-3">
        <div className="h-2 w-3/4 rounded bg-white/10" />
        <div className="h-2 w-full rounded bg-white/5" />
        {form.position === "top" ? <AdBlock form={form} h={h} isResponsive={isResponsive} w={w} /> : null}
        <div className="space-y-1">
          <div className="h-2 w-full rounded bg-white/5" />
          <div className="h-2 w-5/6 rounded bg-white/5" />
          <div className="h-2 w-full rounded bg-white/5" />
        </div>
        {form.position === "mid_content" ? (
          <AdBlock form={form} h={h} isResponsive={isResponsive} w={w} />
        ) : null}
        <div className="h-2 w-2/3 rounded bg-white/5" />
        {form.position === "bottom" || form.position === "sidebar" ? (
          <AdBlock form={form} h={h} isResponsive={isResponsive} w={w} />
        ) : null}
      </div>
      {form.sticky_allowed ? (
        <p className="mt-2 text-xs text-amber-300/90">⚠ Sticky có thể che nội dung.</p>
      ) : null}
    </div>
  );
}

function AdBlock({
  form,
  w,
  h,
  isResponsive
}: {
  form: AdPlacementFormInput;
  w: number;
  h: number;
  isResponsive: boolean;
}) {
  return (
    <div className="my-2">
      {form.show_label !== false ? (
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Quảng cáo</p>
      ) : null}
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-amber-400/40 bg-amber-400/5 text-center text-xs text-amber-100/90"
        style={{
          width: isResponsive ? "100%" : w,
          maxWidth: form.max_width ?? undefined,
          minHeight: form.reserve_space !== false ? (form.min_height ?? h) : h,
          height: isResponsive ? undefined : h
        }}
      >
        {form.is_test_mode !== false
          ? `Test · ${form.placement_key || "placement"}`
          : form.adsense_slot_id
            ? `Slot ${form.adsense_slot_id}`
            : "Chưa cấu hình slot"}
      </div>
    </div>
  );
}
