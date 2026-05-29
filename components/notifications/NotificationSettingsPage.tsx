"use client";

import { useEffect, useState, useTransition } from "react";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import {
  mergeExtendedNotificationPreferences,
  saveExtendedNotificationPreferences
} from "@/lib/notifications/extended-preferences-client";
import type { NotificationPreferences } from "@/types/notification";

type NotificationSettingsPageProps = {
  initialPreferences: NotificationPreferences;
};

const settingsItems: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}> = [
  {
    key: "reader_enabled",
    label: "Thông báo truyện",
    description: "Chương mới, truyện đang đọc, đề xuất phù hợp."
  },
  {
    key: "author_enabled",
    label: "Thông báo tác giả",
    description: "Tác giả bạn theo dõi, lời cảm ơn, hoạt động mới."
  },
  {
    key: "community_enabled",
    label: "Thông báo cộng đồng",
    description: "Bình luận, thích, nhóm truyện, poll và challenge."
  },
  {
    key: "wallet_enabled",
    label: "Thông báo ví coin",
    description: "Nạp coin, mua chương, hoàn coin, rút tiền creator."
  },
  {
    key: "creator_enabled",
    label: "Thông báo creator",
    description: "Bình luận truyện, mốc đọc, tip, doanh thu, duyệt truyện."
  },
  {
    key: "system_enabled",
    label: "Thông báo hệ thống",
    description: "Cảnh báo tài khoản, chính sách, bảo trì."
  }
];

export function NotificationSettingsPage({ initialPreferences }: NotificationSettingsPageProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isSaving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPreferences(mergeExtendedNotificationPreferences(initialPreferences));
  }, [initialPreferences]);

  function onToggle(key: keyof NotificationPreferences) {
    setSaved(false);
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  function onSave() {
    startSave(async () => {
      const response = await fetch("/api/notifications/preferences", {
        body: JSON.stringify(preferences),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      if (response.ok) {
        saveExtendedNotificationPreferences(preferences);
        setSaved(true);
      }
    });
  }

  return (
    <section className="space-y-4 pb-4">
      <MobileBackHeader
        fallbackHref="/notifications"
        title="Cài đặt thông báo"
        variant="compact"
      />

      <p className="text-sm leading-6 text-zinc-400">
        Chọn loại thông báo bạn muốn nhận trong ứng dụng. Email sẽ được bổ sung sau.
      </p>

      <div className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
        {settingsItems.map((item) => (
          <label
            className="flex cursor-pointer items-start justify-between gap-3 px-3 py-3"
            key={item.key}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-100">{item.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                {item.description}
              </span>
            </span>
            <input
              checked={preferences[item.key]}
              className="mt-1 size-4 shrink-0 accent-cyan-300"
              onChange={() => onToggle(item.key)}
              type="checkbox"
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3">
        <p className="text-xs font-semibold text-zinc-300">Email (sắp có)</p>
        <p className="mt-1 text-xs text-zinc-500">
          Thông báo qua email sẽ được bật khi tính năng sẵn sàng.
        </p>
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-300 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200 disabled:opacity-50"
        disabled={isSaving}
        onClick={onSave}
        type="button"
      >
        {isSaving ? "Đang lưu…" : "Lưu cài đặt"}
      </button>

      {saved ? <p className="text-center text-xs text-cyan-300">Đã lưu cài đặt.</p> : null}
    </section>
  );
}
