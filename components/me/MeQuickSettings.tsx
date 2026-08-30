"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { UnreadBadge } from "@/components/messages/UnreadBadge";
import { useMessageUnread } from "@/components/messages/message-unread-context";
import { Card } from "@/components/ui";

type SettingsGroup = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  rows: {
    href: string;
    label: string;
    badge?: number;
  }[];
};

type MeQuickSettingsProps = {
  publicProfilePath: string | null;
  unreadNotificationCount: number;
  compact?: boolean;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="text-zinc-500">
      {open ? "−" : "+"}
    </span>
  );
}

function SettingsRow({
  href,
  label,
  badge
}: {
  href: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      className="flex min-h-10 items-center justify-between gap-3 px-3.5 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.03]"
      href={href}
    >
      <span>{label}</span>
      {badge != null && badge > 0 ? (
        <UnreadBadge count={badge} />
      ) : (
        <span aria-hidden="true" className="text-zinc-600">
          →
        </span>
      )}
    </Link>
  );
}

export function MeQuickSettings({
  compact = false,
  publicProfilePath,
  unreadNotificationCount
}: MeQuickSettingsProps) {
  const messageUnread = useMessageUnread()?.messageUnread ?? 0;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    account: true,
    communication: false,
    content: false,
    support: false
  });

  const groups: SettingsGroup[] = [
    {
      id: "account",
      title: "Tài khoản",
      defaultOpen: true,
      rows: [
        ...(publicProfilePath
          ? [{ href: publicProfilePath, label: "Hồ sơ công khai" }]
          : [{ href: "/me/settings", label: "Tạo username" }]),
        { href: "/me/settings", label: "Tài khoản & hồ sơ" },
        { href: "/me/settings/privacy", label: "Quyền riêng tư" }
      ]
    },
    {
      id: "communication",
      title: "Liên lạc",
      rows: [
        { href: "/messages", label: "Tin nhắn", badge: messageUnread },
        { href: "/notifications", label: "Thông báo", badge: unreadNotificationCount },
        { href: "/me/settings/messages", label: "Cài đặt tin nhắn" }
      ]
    },
    {
      id: "content",
      title: "Nội dung",
      rows: [
        { href: "/me/library?tab=collections", label: "Tủ truyện" },
        { href: "/me/library?tab=saved", label: "Đã lưu" },
        { href: "/me/library?tab=reading", label: "Lịch sử đọc" }
      ]
    },
    {
      id: "support",
      title: "Hỗ trợ & pháp lý",
      rows: [
        { href: "/me#lien-he", label: "Gửi góp ý" },
        { href: "/chinh-sach", label: "Chính sách & điều khoản" },
        { href: "/me#lien-he", label: "Liên hệ ChapMee" }
      ]
    }
  ];

  function toggleGroup(id: string) {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <section className="space-y-2" id="cai-dat">
      <h2 className={`font-bold text-white ${compact ? "text-sm" : "text-base"}`}>
        Cài đặt nhanh
      </h2>
      <Card className="overflow-hidden p-0">
        {groups.map((group, groupIndex) => {
          const isOpen = openGroups[group.id] ?? group.defaultOpen ?? false;
          return (
            <div
              className={groupIndex > 0 ? "border-t border-white/5" : ""}
              key={group.id}
            >
              <button
                className="flex w-full min-h-10 items-center justify-between px-3.5 py-2 text-left text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.03]"
                onClick={() => toggleGroup(group.id)}
                type="button"
              >
                <span>{group.title}</span>
                <Chevron open={isOpen} />
              </button>
              {isOpen ? (
                <div className="border-t border-white/5 pb-1">
                  {group.rows.map((row) => (
                    <SettingsRow
                      badge={row.badge}
                      href={row.href}
                      key={`${group.id}-${row.href}-${row.label}`}
                      label={row.label}
                    />
                  ))}
                  {group.id === "account" ? (
                    <div className="border-t border-white/5 px-3.5 py-2">
                      <LogoutButton variant="subtle" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>
    </section>
  );
}
