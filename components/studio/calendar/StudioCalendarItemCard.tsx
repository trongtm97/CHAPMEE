"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import {
  statusBadgeClass,
  statusDisplayLabel,
  calendarBtnCompactPrimary,
  calendarBtnCompactSecondary,
  calendarBtnDanger
} from "@/components/studio/calendar/shared/styles";
import { TARGET_TYPE_LABELS } from "@/lib/studio/scheduling/status-labels";
import {
  cancelScheduledPublicationAction,
  publishNowAction,
  updateScheduledPublicationAction
} from "@/lib/studio/scheduling/scheduling-actions";
import type { ScheduledPublicationListItem } from "@/types/scheduling";

type StudioCalendarItemCardProps = {
  item: ScheduledPublicationListItem;
  compact?: boolean;
};

function toLocalDateInput(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric"
  }).format(new Date(iso));
}

function toLocalTimeInput(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(iso));
}

export function StudioCalendarItemCard({
  compact = false,
  item
}: StudioCalendarItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(toLocalDateInput(item.scheduledAt));
  const [scheduleTime, setScheduleTime] = useState(toLocalTimeInput(item.scheduledAt));
  const [error, setError] = useState<string | null>(null);

  const badgeLabel = statusDisplayLabel(item.status, item.isScheduledToday);

  async function handleCancel() {
    if (
      !window.confirm(
        "Bạn có chắc muốn hủy lịch đăng này? Hành động này không thể hoàn tác."
      )
    ) {
      return { ok: false };
    }

    const result = await cancelScheduledPublicationAction(item.id);

    if (result.ok) {
      startTransition(() => router.refresh());
    }

    return { error: result.error ?? undefined, ok: result.ok };
  }

  async function handlePublishNow() {
    if (
      !window.confirm(
        "Đăng ngay nội dung này? Trạng thái sẽ thay đổi ngay lập tức."
      )
    ) {
      return { ok: false };
    }

    const result = await publishNowAction({
      storyId: item.storyId,
      targetId: item.targetId,
      targetType: item.targetType
    });

    if (result.ok) {
      startTransition(() => router.refresh());
    }

    return { error: result.error ?? undefined, ok: result.ok };
  }

  const menuItems = [
    ...(item.previewHref
      ? [
          {
            href: item.previewHref,
            label: "Xem nội dung",
            type: "link" as const
          }
        ]
      : []),
    ...(item.storySlug
      ? [
          {
            href: `/truyen/${item.storySlug}`,
            label: "Xem truyện",
            type: "link" as const
          }
        ]
      : []),
    ...(item.previewHref
      ? [
          {
            label: "Sao chép link",
            onAction: async () => {
              const origin =
                typeof window !== "undefined" ? window.location.origin : "";
              await navigator.clipboard.writeText(`${origin}${item.previewHref}`);
              return { ok: true };
            },
            type: "action" as const
          }
        ]
      : [])
  ];

  return (
    <article
      className={`rounded-xl border border-white/10 bg-white/[0.02] ${
        compact ? "p-2.5" : "p-3 sm:p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] font-semibold text-zinc-300">
              {TARGET_TYPE_LABELS[item.targetType]}
            </span>
            {item.storyStructureType === "standalone" ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[0.65rem] font-semibold text-cyan-100">
                Một phần
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${statusBadgeClass(item.status, item.isScheduledToday)}`}
            >
              {badgeLabel}
            </span>
          </div>

          <h3
            className={`mt-1.5 font-semibold text-white ${
              compact ? "line-clamp-1 text-sm" : "line-clamp-2 text-base"
            }`}
          >
            {item.displayTitle}
          </h3>

          {item.storyTitle && item.targetType !== "story" ? (
            <p className="mt-0.5 truncate text-xs text-zinc-400">{item.storyTitle}</p>
          ) : null}

          <p className={`mt-1.5 font-medium text-cyan-100 ${compact ? "text-xs" : "text-sm"}`}>
            {item.friendlyScheduleLabel}
          </p>

          <p className="mt-0.5 text-[0.65rem] text-zinc-500">{item.sourceLabel}</p>

          {item.lastError ? (
            <p className="mt-1.5 text-xs text-rose-300">{item.lastError}</p>
          ) : null}
        </div>

        <StudioRowActionMenu ariaLabel="Tùy chọn lịch đăng" items={menuItems} mobileSheet />
      </div>

      {!compact && item.status === "scheduled" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            className={calendarBtnCompactSecondary}
            disabled={isPending}
            onClick={() => setEditing((value) => !value)}
            type="button"
          >
            Sửa lịch
          </button>
          <button
            className={calendarBtnCompactPrimary}
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void handlePublishNow();
              });
            }}
            type="button"
          >
            Đăng ngay
          </button>
          <button
            className={calendarBtnDanger}
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void handleCancel();
              });
            }}
            type="button"
          >
            Hủy lịch
          </button>
        </div>
      ) : null}

      {editing && item.status === "scheduled" ? (
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Ngày"
              onChange={(event) => setScheduleDate(event.target.value)}
              type="date"
              value={scheduleDate}
            />
            <Input
              label="Giờ"
              onChange={(event) => setScheduleTime(event.target.value)}
              type="time"
              value={scheduleTime}
            />
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await updateScheduledPublicationAction({
                    scheduleDate,
                    scheduleId: item.id,
                    scheduleTime
                  });

                  if (!result.ok) {
                    setError(result.error ?? "Không thể cập nhật lịch.");
                    return;
                  }

                  setEditing(false);
                  router.refresh();
                });
              }}
              type="button"
            >
              Lưu lịch
            </Button>
            <Button onClick={() => setEditing(false)} type="button" variant="secondary">
              Đóng
            </Button>
          </div>
        </div>
      ) : null}

      {!compact && item.editHref ? (
        <div className="mt-2">
          <Link
            className="text-xs font-semibold text-sky-300 hover:text-sky-200 sm:text-sm"
            href={item.editHref}
          >
            Mở trong editor
          </Link>
        </div>
      ) : null}
    </article>
  );
}
