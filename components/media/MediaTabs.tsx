"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MediaTabId } from "@/lib/media/media-tabs";
import { mediaTabHref } from "@/lib/media/media-tabs";

type MediaTabsProps = {
  activeTab: MediaTabId;
};

const TAB_COPY: Record<MediaTabId, { label: string; hint: string }> = {
  audio: {
    label: "Audio",
    hint: "Nghe truyện theo cách nhẹ nhàng hơn."
  },
  video: {
    label: "Video",
    hint: "Xem video chuyển thể và nội dung mở rộng từ truyện."
  }
};

function preserveFilterParams(searchParams: URLSearchParams, tab: MediaTabId) {
  const next: Record<string, string | undefined> = { page: "1" };
  const sharedKeys = [
    "q",
    "sort",
    "origin",
    "status",
    "genre",
    "category",
    "subgenre",
    "tag",
    "character",
    "relationship",
    "narrativeStyle",
    "mood",
    "experience",
    "setting",
    "format",
    "presentation",
    "contentType",
    "ageRating",
    "contentWarning",
    "storyStatus",
    "pageSize"
  ];
  for (const key of sharedKeys) {
    const value = searchParams.get(key);
    if (value) {
      next[key] = value;
    }
  }
  if (tab === "audio") {
    const continuous = searchParams.get("continuous");
    if (continuous) next.continuous = continuous;
  }
  return next;
}

export function MediaTabs({ activeTab }: MediaTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-1">
      <div
        className="inline-flex w-full max-w-sm rounded-lg border border-white/10 bg-[#0a1017]/80 p-0.5"
        role="tablist"
        aria-label="Loại nội dung"
      >
        {(["audio", "video"] as const).map((tabId) => {
          const active = activeTab === tabId;
          const href =
            pathname === "/media"
              ? mediaTabHref(tabId, preserveFilterParams(searchParams, tabId))
              : mediaTabHref(tabId, { page: "1" });

          return (
            <Link
              aria-selected={active}
              className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold transition ${
                active
                  ? "bg-cyan-300/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.2)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              href={href}
              key={tabId}
              role="tab"
            >
              {TAB_COPY[tabId].label}
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] leading-snug text-zinc-500">{TAB_COPY[activeTab].hint}</p>
    </div>
  );
}
