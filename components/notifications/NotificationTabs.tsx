"use client";

import type { NotificationFilterTab } from "@/types/notification";

const tabs: Array<{ id: NotificationFilterTab; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "reading", label: "Đọc truyện" },
  { id: "author", label: "Tác giả" },
  { id: "community", label: "Cộng đồng" },
  { id: "wallet", label: "Ví coin" },
  { id: "messages", label: "Tin nhắn" },
  { id: "system", label: "Hệ thống" }
];

type NotificationTabsProps = {
  activeTab: NotificationFilterTab;
  onChange: (tab: NotificationFilterTab) => void;
};

export function NotificationTabs({ activeTab, onChange }: NotificationTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-2 px-1 pb-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-cyan-300 text-zinc-950"
                  : "border border-white/12 bg-white/[0.03] text-zinc-300 hover:border-cyan-300/30 hover:text-zinc-100"
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
