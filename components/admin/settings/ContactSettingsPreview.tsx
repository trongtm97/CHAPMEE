"use client";

import {
  isFacebookVisible,
  isFeedbackFormVisible,
  isSupportEmailVisible,
  isTelegramVisible
} from "@/lib/settings/contact-settings-mapper";
import type { ContactSettings } from "@/types/contact-settings";

type ContactSettingsPreviewProps = {
  settings: ContactSettings;
};

export function ContactSettingsPreview({ settings }: ContactSettingsPreviewProps) {
  const channels: { label: string; visible: boolean }[] = [
    { label: "Email", visible: isSupportEmailVisible(settings) },
    { label: "Fanpage", visible: isFacebookVisible(settings) },
    { label: "Telegram", visible: isTelegramVisible(settings) },
    { label: "Gửi góp ý", visible: isFeedbackFormVisible(settings) }
  ];

  const visibleChannels = channels.filter((channel) => channel.visible);

  return (
    <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
        Users sẽ thấy:
      </p>
      <div className="mt-3 space-y-2">
        <p className="text-sm font-black text-white">
          {settings.contactTitle || "Liên hệ & Góp ý"}
        </p>
        {settings.contactDescription ? (
          <p className="text-xs leading-5 text-zinc-400">{settings.contactDescription}</p>
        ) : null}
        {visibleChannels.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {visibleChannels.map((channel) => (
              <span
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-200"
                key={channel.label}
              >
                {channel.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Không hiển thị mục liên hệ (tất cả kênh đang tắt).
          </p>
        )}
      </div>
    </div>
  );
}
