"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Card } from "@/components/ui";
import { PrivacySettingsAccordion } from "@/components/me/PrivacySettingsAccordion";

type SettingsCompactProps = {
  unreadNotificationCount: number;
};

export function SettingsCompact({ unreadNotificationCount }: SettingsCompactProps) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <section className="space-y-3" id="cai-dat">
      <h2 className="text-lg font-black text-white">Cài đặt</h2>
      <Card className="overflow-hidden p-0">
        <Link
          className="flex min-h-12 items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.04]"
          href="/notifications"
        >
          <span>Thông báo</span>
          {unreadNotificationCount > 0 ? (
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-cyan-300 px-2 py-0.5 text-xs font-black text-zinc-950">
              {unreadNotificationCount}
            </span>
          ) : (
            <span className="text-zinc-500">→</span>
          )}
        </Link>
        <Link
          className="flex min-h-12 items-center justify-between border-t border-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.04]"
          href="/me/settings/privacy"
        >
          <span>Hồ sơ công khai</span>
          <span className="text-zinc-500">→</span>
        </Link>
        <PrivacySettingsAccordion />
        <div className="border-t border-white/5">
          <button
            className="flex w-full min-h-11 items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.03]"
            onClick={() => setAccountOpen((value) => !value)}
            type="button"
          >
            <span>Tài khoản</span>
            <span className="text-zinc-500">{accountOpen ? "−" : "+"}</span>
          </button>
          {accountOpen ? (
            <div className="space-y-2 border-t border-white/5 px-4 pb-3 pt-2">
              <Link
                className="block text-sm text-zinc-400 transition hover:text-zinc-200"
                href="/me/settings"
              >
                Sửa hồ sơ
              </Link>
              <Link
                className="block text-sm text-zinc-400 transition hover:text-zinc-200"
                href="/me/account-status"
              >
                Trạng thái tài khoản
              </Link>
              <Link
                className="block text-sm text-zinc-400 transition hover:text-zinc-200"
                href="/chinh-sach"
              >
                Chính sách & điều khoản
              </Link>
              <Link
                className="block text-sm text-zinc-400 transition hover:text-zinc-200"
                href="/community-guidelines"
              >
                Quy định cộng đồng
              </Link>
              <LogoutButton variant="subtle" />
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
