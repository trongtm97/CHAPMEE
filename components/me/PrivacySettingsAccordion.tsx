"use client";

import { useEffect, useState } from "react";
import { readStorageItem, STORAGE_KEYS, writeStorageItem } from "@/lib/brand/storage";

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

const labels: { key: PrivacySettingKey; label: string }[] = [
  { key: "showBookshelf", label: "Hiển thị tủ truyện công khai" },
  { key: "showComments", label: "Hiển thị hoạt động bình luận" },
  { key: "showReading", label: "Hiển thị truyện đang đọc" },
  { key: "showAchievements", label: "Hiển thị badge/thành tích" },
  { key: "allowFollow", label: "Cho người khác follow" }
];

type PrivacySettingsAccordionProps = {
  defaultOpen?: boolean;
};

export function PrivacySettingsAccordion({ defaultOpen = false }: PrivacySettingsAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
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
    <div className="border-t border-white/5" id="quyen-rieng-tu">
      <button
        className="flex w-full min-h-10 items-center justify-between px-3.5 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/[0.03]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>Quyền riêng tư</span>
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-white/6 px-4 pb-3 pt-2">
          {labels.map((item) => (
            <label
              className="flex cursor-pointer items-center justify-between gap-3 py-1.5"
              key={item.key}
            >
              <span className="text-xs text-zinc-400">{item.label}</span>
              <input
                checked={settings[item.key]}
                className="size-3.5 shrink-0 accent-cyan-300"
                onChange={(event) => updateSetting(item.key, event.target.checked)}
                type="checkbox"
              />
            </label>
          ))}
          <p className="pt-1 text-[0.65rem] text-zinc-600">Lưu tạm trên thiết bị.</p>
        </div>
      ) : null}
    </div>
  );
}
