"use client";

import { useEffect, useState } from "react";
import { readStorageItem, STORAGE_KEYS, writeStorageItem } from "@/lib/brand/storage";
import { Card } from "@/components/ui";

type PrivacySettingKey =
  | "showBookshelf"
  | "showComments"
  | "showReading"
  | "showAchievements"
  | "allowFollow";

type PrivacySettings = Record<PrivacySettingKey, boolean>;

const STORAGE_KEY = STORAGE_KEYS.privacySettings;

const defaultSettings: PrivacySettings = {
  showBookshelf: true,
  showComments: false,
  showReading: false,
  showAchievements: true,
  allowFollow: true
};

const labels: { key: PrivacySettingKey; label: string; hint: string }[] = [
  {
    key: "showBookshelf",
    label: "Hiển thị tủ truyện công khai",
    hint: "Người khác có thể xem tủ truyện bạn chia sẻ."
  },
  {
    key: "showComments",
    label: "Hiển thị hoạt động bình luận",
    hint: "Bình luận gần đây có thể hiện trên hồ sơ công khai."
  },
  {
    key: "showReading",
    label: "Hiển thị truyện đang đọc",
    hint: "Tiến độ đọc sẽ ẩn mặc định để bảo vệ riêng tư."
  },
  {
    key: "showAchievements",
    label: "Hiển thị badge/thành tích",
    hint: "Khoe thành tích đọc với cộng đồng."
  },
  {
    key: "allowFollow",
    label: "Cho người khác follow",
    hint: "Cho phép độc giả khác theo dõi hồ sơ của bạn."
  }
];

export function PrivacySettingsCard() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = readStorageItem(STORAGE_KEY);
      if (raw) {
        setSettings({ ...defaultSettings, ...JSON.parse(raw) });
      }
    } catch {
      // Keep defaults.
    }
    setReady(true);
  }, []);

  function updateSetting(key: PrivacySettingKey, value: boolean) {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      try {
        writeStorageItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // TODO: persist to backend when privacy API is available.
      }
      return next;
    });
  }

  if (!ready) {
    return null;
  }

  return (
    <Card className="space-y-4 p-4" id="quyen-rieng-tu">
      <div>
        <h3 className="text-base font-black text-white">Quyền riêng tư</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Cài đặt hiển thị hồ sơ công khai. Lưu tạm trên thiết bị.
        </p>
      </div>
      <div className="space-y-3">
        {labels.map((item) => (
          <label
            className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            key={item.key}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-100">{item.label}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.hint}</span>
            </span>
            <input
              checked={settings[item.key]}
              className="mt-1 size-4 shrink-0 accent-cyan-300"
              onChange={(event) => updateSetting(item.key, event.target.checked)}
              type="checkbox"
            />
          </label>
        ))}
      </div>
    </Card>
  );
}
