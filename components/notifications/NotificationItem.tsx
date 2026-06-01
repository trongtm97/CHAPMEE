"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationAsReadByIdAction } from "@/lib/actions/notifications";
import { getCampaignNotificationTypeLabel } from "@/lib/notifications/campaign-type-labels";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import {
  getNotificationNavigateUrl,
  getSafeNotificationHref
} from "@/lib/notifications/get-notification-action-url";
import { isMockNotificationId } from "@/lib/notifications/mock-notifications";
import type { NotificationItem as NotificationItemType } from "@/types/notification";

type NotificationItemProps = {
  item: NotificationItemType;
  onRead: (id: string) => void;
};

export function NotificationItem({ item, onRead }: NotificationItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isUnread = !item.read_at;
  const campaignTypeLabel = getCampaignNotificationTypeLabel(item.metadata?.campaign_type);
  const internalHref = getSafeNotificationHref(item);
  const navigateUrl = getNotificationNavigateUrl(item);

  function handleClick() {
    startTransition(async () => {
      onRead(item.id);

      if (!isMockNotificationId(item.id)) {
        await markNotificationAsReadByIdAction(item.id);
      }

      if (!navigateUrl) {
        return;
      }

      if (isMockNotificationId(item.id)) {
        router.push(navigateUrl);
        return;
      }

      router.push(
        `/notifications/open?id=${encodeURIComponent(item.id)}&next=${encodeURIComponent(navigateUrl)}`
      );
    });
  }

  return (
    <button
      className={`tap-highlight flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.03] disabled:opacity-70 ${
        isUnread ? "border border-cyan-300/10 bg-cyan-300/[0.04]" : "border border-transparent"
      }`}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      <div className="relative mt-0.5 shrink-0">
        <span
          className={`inline-flex size-10 items-center justify-center rounded-full ${
            isUnread ? "bg-cyan-400/12 text-cyan-200" : "bg-white/[0.05] text-zinc-400"
          }`}
        >
          <BellIcon />
        </span>
        {isUnread ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 top-0 size-2 rounded-full bg-cyan-300 ring-2 ring-[#0b1016]"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 flex-1 text-sm font-semibold text-zinc-100">{item.title}</p>
          {campaignTypeLabel ? (
            <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-100">
              {campaignTypeLabel}
            </span>
          ) : null}
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{item.body}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isUnread
                ? "bg-cyan-400/10 text-cyan-200"
                : "bg-zinc-800/80 text-zinc-500"
            }`}
          >
            {isUnread ? "Chưa đọc" : "Đã đọc"}
          </span>
          <span className="text-[11px] text-zinc-500">{formatRelativeTime(item.created_at)}</span>
          {internalHref ? (
            <span className="text-[11px] font-medium text-cyan-300">Xem chi tiết →</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M12 2.75a5.25 5.25 0 0 0-5.25 5.25v3.1l-.98 1.63a1.25 1.25 0 0 0 1.07 1.9h10.32a1.25 1.25 0 0 0 1.07-1.9l-.98-1.63v-3.1A5.25 5.25 0 0 0 12 2.75Zm-1.5 14.5h3a1.5 1.5 0 0 1-3 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
