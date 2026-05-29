"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { updateMonetizationSettingsAction } from "@/lib/admin/monetization-actions";
import type { MonetizationSettingsMap } from "@/types/monetization";

const FOCUSED_KEYS: Array<{
  key: keyof MonetizationSettingsMap;
  label: string;
  type: "boolean" | "number";
}> = [
  { key: "monetization.enabled", label: "Bật hệ sinh thái tiền", type: "boolean" },
  { key: "creator_monetization.enabled", label: "Monetization tác giả", type: "boolean" },
  { key: "paid_chapters.enabled", label: "Chương trả phí", type: "boolean" },
  { key: "tips.enabled", label: "Tip", type: "boolean" },
  { key: "payout.enabled", label: "Cho phép rút tiền", type: "boolean" },
  { key: "revenue_share.default_creator_percent", label: "% tác giả (mặc định)", type: "number" },
  { key: "revenue_share.platform_fee_percent", label: "% phí nền tảng", type: "number" },
  { key: "payout.min_withdraw_amount_vnd", label: "Rút tối thiểu (VND)", type: "number" },
  { key: "coin.exchange_rate_vnd", label: "Tỷ giá coin → VND", type: "number" },
  { key: "paid_chapters.min_coin_price", label: "Giá coin tối thiểu", type: "number" },
  { key: "paid_chapters.max_coin_price", label: "Giá coin tối đa", type: "number" },
  { key: "payout.manual_review_required", label: "Rút tiền cần duyệt thủ công", type: "boolean" },
  { key: "payout.hold_days", label: "Ngày giữ/ xử lý rút (tham khảo)", type: "number" }
];

type AdminMonetizationSettingsFormProps = {
  settings: MonetizationSettingsMap;
};

export function AdminMonetizationSettingsForm({
  settings: initialSettings
}: AdminMonetizationSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const payload = useMemo(() => JSON.stringify(settings), [settings]);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("settingsPayload", payload);
      const result = await updateMonetizationSettingsAction(
        { ok: false, message: null, settings: initialSettings, updatedAt: null },
        formData
      );
      if (!result.ok) {
        setMessage(result.message ?? "Không lưu được.");
        return;
      }
      setSettings(result.settings);
      setMessage(result.message ?? "Đã lưu.");
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      {FOCUSED_KEYS.map((field) => {
        const value = settings[field.key];
        if (field.type === "boolean") {
          return (
            <label key={field.key} className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                checked={Boolean(value)}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    [field.key]: e.target.checked
                  }))
                }
                type="checkbox"
              />
              {field.label}
            </label>
          );
        }
        return (
          <label key={field.key} className="block text-sm">
            <span className="text-zinc-400">{field.label}</span>
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
              type="number"
              value={Number(value)}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  [field.key]: Number(e.target.value)
                }))
              }
            />
          </label>
        );
      })}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      <Button disabled={pending} onClick={save} type="button">
        {pending ? "Đang lưu…" : "Lưu cấu hình kiếm tiền"}
      </Button>
      <p className="text-xs text-zinc-500">
        Cấu hình đầy đủ (coin pack, VIP, …) tại{" "}
        <a className="text-cyan-300" href="/admin/monetization">
          /admin/monetization
        </a>
        .
      </p>
    </div>
  );
}
