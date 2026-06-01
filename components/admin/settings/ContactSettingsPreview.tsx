"use client";

import type { ReactNode } from "react";
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

function PreviewButton({
  label,
  icon
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 text-xs font-semibold text-zinc-200">
      {icon}
      {label}
    </span>
  );
}

export function ContactSettingsPreview({ settings }: ContactSettingsPreviewProps) {
  const channels: { label: string; visible: boolean; icon: ReactNode }[] = [
    {
      label: settings.emailLabel || "Gửi email",
      visible: isSupportEmailVisible(settings),
      icon: (
        <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: settings.fanpageLabel || "Fanpage",
      visible: isFacebookVisible(settings),
      icon: (
        <svg className="h-3.5 w-3.5 text-cyan-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    },
    {
      label: settings.telegramLabel || "Telegram",
      visible: isTelegramVisible(settings),
      icon: (
        <svg className="h-3.5 w-3.5 text-cyan-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      )
    },
    {
      label: "Gửi góp ý",
      visible: isFeedbackFormVisible(settings),
      icon: (
        <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    }
  ];

  const visibleChannels = channels.filter((channel) => channel.visible);

  return (
    <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
        User sẽ thấy
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
              <PreviewButton icon={channel.icon} key={channel.label} label={channel.label} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Module này sẽ không hiển thị ngoài app.
          </p>
        )}
      </div>
    </div>
  );
}
