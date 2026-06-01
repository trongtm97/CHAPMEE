"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminAdsPlacementPreview } from "@/components/admin/ads/AdminAdsPlacementPreview";
import {
  EMPTY_AD_PLACEMENT_FORM,
  rowToForm
} from "@/components/admin/ads/admin-ads-form-defaults";
import { Button, Input } from "@/components/ui";
import { AD_SIZE_PRESETS } from "@/lib/ads/ad-size-presets";
import {
  slugifyPlacementKey,
  validatePlacementForm
} from "@/lib/ads/validate-placement-form";
import {
  AD_ATTRIBUTION_OPTIONS,
  AD_DEVICE_OPTIONS,
  AD_FORMAT_OPTIONS,
  AD_POSITION_OPTIONS,
  AD_REVENUE_BUCKET_OPTIONS,
  AD_SIZE_MODE_OPTIONS,
  AD_SURFACE_OPTIONS,
  type AdPlacementFormInput,
  type AdPlacementRow
} from "@/types/ads";

type AdminAdsPlacementDrawerProps = {
  open: boolean;
  editing: AdPlacementRow | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function AdminAdsPlacementDrawer({
  open,
  editing,
  canEdit,
  onClose,
  onSaved
}: AdminAdsPlacementDrawerProps) {
  const [form, setForm] = useState<AdPlacementFormInput>(EMPTY_AD_PLACEMENT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reelsConfirm, setReelsConfirm] = useState(false);
  const [autoKey, setAutoKey] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm(rowToForm(editing));
      setAutoKey(false);
    } else {
      setForm(EMPTY_AD_PLACEMENT_FORM);
      setAutoKey(true);
    }
    setError(null);
    setReelsConfirm(false);
  }, [open, editing]);

  const validation = useMemo(() => validatePlacementForm(form, { isEdit: Boolean(editing) }), [form, editing]);

  const update = <K extends keyof AdPlacementFormInput>(key: K, value: AdPlacementFormInput[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && autoKey && !editing) {
        next.placement_key = slugifyPlacementKey(String(value));
      }
      return next;
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = AD_SIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      size_mode: preset.size_mode,
      width: preset.width,
      height: preset.height
    }));
  };

  const save = async () => {
    if (!canEdit) return;
    if (!validation.ok) {
      setError(Object.values(validation.errors)[0] ?? "Dữ liệu không hợp lệ.");
      return;
    }
    if (validation.needsReelsLiveConfirm && !reelsConfirm) {
      setError("Vui lòng xác nhận bật live quảng cáo Reels.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const url = editing
        ? `/api/admin/ads/placements/${editing.id}`
        : "/api/admin/ads/placements";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Lưu thất bại.");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0b0f14] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {editing ? "Sửa placement" : "Tạo placement"}
            </h2>
            <p className="text-xs text-zinc-500">Cấu hình hiển thị, AdSense và UX guard</p>
          </div>
          <button className="text-sm text-zinc-400 hover:text-white" onClick={onClose} type="button">
            Đóng
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {validation.warnings.length > 0 ? (
            <ul className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
              {validation.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-200">Thông tin cơ bản</h3>
            <Field label="Tên placement">
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} disabled={!canEdit} />
            </Field>
            <Field label="Key (snake_case)">
              <Input
                value={form.placement_key}
                onChange={(e) => {
                  setAutoKey(false);
                  update("placement_key", e.target.value);
                }}
                disabled={!canEdit || Boolean(editing)}
              />
            </Field>
            <Field label="Mô tả">
              <Input
                value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Surface">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.surface}
                  onChange={(e) => update("surface", e.target.value)}
                  disabled={!canEdit}
                >
                  {AD_SURFACE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Thiết bị">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.device}
                  onChange={(e) => update("device", e.target.value as AdPlacementFormInput["device"])}
                  disabled={!canEdit}
                >
                  {AD_DEVICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vị trí">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.position}
                  onChange={(e) =>
                    update("position", e.target.value as AdPlacementFormInput["position"])
                  }
                  disabled={!canEdit}
                >
                  {AD_POSITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ưu tiên (số nhỏ = trước)">
                <Input
                  inputMode="numeric"
                  value={String(form.priority ?? 100)}
                  onChange={(e) => update("priority", Number(e.target.value) || 100)}
                  disabled={!canEdit}
                />
              </Field>
            </div>
            <Field label="page_pattern (tùy chọn)">
              <Input
                value={form.page_pattern ?? ""}
                onChange={(e) => update("page_pattern", e.target.value)}
                disabled={!canEdit}
                placeholder="/truyen/*/chuong/*"
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-200">Hiển thị & trạng thái</h3>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
              {(
                [
                  ["is_enabled", "Bật placement"],
                  ["is_test_mode", "Test mode"],
                  ["lazy_load", "Lazy load"],
                  ["reserve_space", "Reserve space (chống CLS)"],
                  ["show_label", 'Nhãn "Quảng cáo"'],
                  ["sticky_allowed", "Cho phép sticky"],
                  ["hide_for_owner", "Ẩn với tác giả xem tác phẩm mình"],
                  ["hide_on_sensitive_content", "Ẩn nội dung nhạy cảm"],
                  ["no_ads_respect", "Tôn trọng cờ no-ads"],
                  ["hide_for_vip", "Ẩn với VIP (sau này)"]
                ] as const
              ).map(([key, label]) => (
                <label className="flex items-center gap-2" key={key}>
                  <input
                    checked={Boolean(form[key])}
                    disabled={!canEdit}
                    onChange={(e) => update(key, e.target.checked)}
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-200">Kích thước & định dạng</h3>
            <div className="flex flex-wrap gap-2">
              {AD_SIZE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:border-cyan-400/40"
                  onClick={() => applyPreset(p.id)}
                  type="button"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Định dạng">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.ad_format}
                  onChange={(e) =>
                    update("ad_format", e.target.value as AdPlacementFormInput["ad_format"])
                  }
                  disabled={!canEdit}
                >
                  {AD_FORMAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Chế độ size">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.size_mode}
                  onChange={(e) =>
                    update("size_mode", e.target.value as AdPlacementFormInput["size_mode"])
                  }
                  disabled={!canEdit}
                >
                  {AD_SIZE_MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Width">
                <Input
                  inputMode="numeric"
                  value={form.width != null ? String(form.width) : ""}
                  onChange={(e) =>
                    update("width", e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Height">
                <Input
                  inputMode="numeric"
                  value={form.height != null ? String(form.height) : ""}
                  onChange={(e) =>
                    update("height", e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-200">AdSense</h3>
            <Field label="Client ID">
              <Input
                value={form.adsense_client_id ?? ""}
                onChange={(e) => update("adsense_client_id", e.target.value)}
                disabled={!canEdit}
                placeholder="ca-pub-..."
              />
            </Field>
            <Field label="Slot ID">
              <Input
                value={form.adsense_slot_id ?? ""}
                onChange={(e) => update("adsense_slot_id", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Fallback text">
              <Input
                value={form.fallback_text ?? ""}
                onChange={(e) => update("fallback_text", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Ghi chú nội bộ">
              <Input
                value={form.internal_note ?? ""}
                onChange={(e) => update("internal_note", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-200">UX guard</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Đoạn tối thiểu trước QC">
                <Input
                  inputMode="numeric"
                  value={String(form.min_paragraphs_before ?? 0)}
                  onChange={(e) => update("min_paragraphs_before", Number(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Đoạn tối thiểu sau QC">
                <Input
                  inputMode="numeric"
                  value={String(form.min_paragraphs_after ?? 0)}
                  onChange={(e) => update("min_paragraphs_after", Number(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Tối đa / trang">
                <Input
                  inputMode="numeric"
                  value={String(form.max_per_page ?? 1)}
                  onChange={(e) => update("max_per_page", Number(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Tối đa / chương">
                <Input
                  inputMode="numeric"
                  value={String(form.max_ads_per_chapter ?? 2)}
                  onChange={(e) => update("max_ads_per_chapter", Number(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Khoảng cách tối thiểu (px)">
                <Input
                  inputMode="numeric"
                  value={String(form.min_distance_px ?? 800)}
                  onChange={(e) => update("min_distance_px", Number(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Cooldown feed (mục)">
                <Input
                  inputMode="numeric"
                  value={form.feed_cooldown_items != null ? String(form.feed_cooldown_items) : ""}
                  onChange={(e) =>
                    update(
                      "feed_cooldown_items",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-200">Chuẩn bị chia doanh thu</h3>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={Boolean(form.revenue_eligible)}
                disabled={!canEdit}
                onChange={(e) => update("revenue_eligible", e.target.checked)}
                type="checkbox"
              />
              Revenue eligible
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Attribution">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.attribution_mode}
                  onChange={(e) =>
                    update(
                      "attribution_mode",
                      e.target.value as AdPlacementFormInput["attribution_mode"]
                    )
                  }
                  disabled={!canEdit}
                >
                  {AD_ATTRIBUTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Revenue bucket">
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  value={form.revenue_bucket}
                  onChange={(e) =>
                    update("revenue_bucket", e.target.value as AdPlacementFormInput["revenue_bucket"])
                  }
                  disabled={!canEdit}
                >
                  {AD_REVENUE_BUCKET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {validation.needsReelsLiveConfirm ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <input
                checked={reelsConfirm}
                onChange={(e) => setReelsConfirm(e.target.checked)}
                type="checkbox"
              />
              Tôi hiểu rủi ro khi bật live quảng cáo giữa Reels.
            </label>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminAdsPlacementPreview form={form} variant="mobile" />
            <AdminAdsPlacementPreview form={form} variant="desktop" />
          </div>
        </div>

        <footer className="border-t border-white/10 px-5 py-4">
          {error ? <p className="mb-2 text-sm text-red-300">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Hủy
            </Button>
            <Button disabled={!canEdit || saving} onClick={() => void save()} type="button">
              {saving ? "Đang lưu…" : "Lưu placement"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
