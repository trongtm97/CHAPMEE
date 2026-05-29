"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { UnreadBadge } from "@/components/messages/UnreadBadge";
import { useMessageUnread } from "@/components/messages/message-unread-context";
import { Card } from "@/components/ui";
import { PrivacySettingsAccordion } from "@/components/me/PrivacySettingsAccordion";

type SettingsQuickCardProps = {
  unreadNotificationCount: number;
  coinBalance?: number | null;
  coinDisplayName?: string;
};

export function SettingsQuickCard({
  coinBalance,
  coinDisplayName = "Coin",
  unreadNotificationCount
}: SettingsQuickCardProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const messageUnread = useMessageUnread();

  return (
    <section className="space-y-2" id="cai-dat">
      <h2 className="text-base font-bold text-white">Cài đặt nhanh</h2>
      <Card className="overflow-hidden p-0">
        <Link
          className="flex min-h-10 items-center justify-between px-3.5 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.03]"
          href="/notifications"
        >
          <span>Thông báo</span>
          {unreadNotificationCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1.5 py-0.5 text-[0.65rem] font-black text-zinc-950">
              {unreadNotificationCount}
            </span>
          ) : (
            <span className="text-zinc-600">→</span>
          )}
        </Link>
        {coinBalance != null ? (
          <div
            className="flex min-h-9 items-center justify-between border-t border-white/5 px-3.5 py-2 text-sm text-zinc-400"
            id="vi-coin"
          >
            <span>Ví coin</span>
            <span className="font-semibold text-zinc-200">
              {coinBalance} {coinDisplayName}
            </span>
          </div>
        ) : null}
        <Link
          className="flex min-h-10 items-center justify-between border-t border-white/5 px-3.5 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.03]"
          href="/messages"
        >
          <span>Tin nhắn</span>
          {(messageUnread?.messageUnread ?? 0) > 0 ? (
            <UnreadBadge count={messageUnread?.messageUnread ?? 0} />
          ) : (
            <span className="text-zinc-600">→</span>
          )}
        </Link>
        <Link
          className="flex min-h-11 items-center justify-between border-t border-white/5 px-4 py-3 text-sm font-semibold text-zinc-100"
          href="/me/settings/privacy"
        >
          <span>Hồ sơ công khai</span>
          <span className="text-zinc-500">→</span>
        </Link>
        <Link
          className="flex min-h-10 items-center justify-between border-t border-white/5 px-3.5 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.03]"
          href="/me/settings/messages"
        >
          <span>Cài đặt tin nhắn</span>
          <span className="text-zinc-600">→</span>
        </Link>
        <PrivacySettingsAccordion />
        <div className="border-t border-white/5">
          <button
            className="flex w-full min-h-10 items-center justify-between px-3.5 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/[0.03]"
            onClick={() => setAccountOpen((value) => !value)}
            type="button"
          >
            <span>Tài khoản</span>
            <span className="text-zinc-500">{accountOpen ? "−" : "+"}</span>
          </button>
          {accountOpen ? (
            <div className="space-y-2 border-t border-white/5 px-3.5 pb-3 pt-2">
              <Link
                className="block text-xs text-zinc-400 transition hover:text-zinc-200"
                href="/me/settings"
              >
                Sửa hồ sơ
              </Link>
              <LogoutButton variant="subtle" />
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
