"use client";

import type { NotificationFilterTab } from "@/types/notification";

const tabs: Array<{ id: NotificationFilterTab; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "read", label: "Đã đọc" }
];

type NotificationTabsProps = {
  activeTab: NotificationFilterTab;
  onChange: (tab: NotificationFilterTab) => void;
};

export function NotificationTabs({ activeTab, onChange }: NotificationTabsProps) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
              active
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/12 bg-white/[0.03] text-zinc-400 hover:border-cyan-300/30 hover:text-zinc-200"
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
  );
}
