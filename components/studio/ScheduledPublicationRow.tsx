"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import {
  TARGET_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS
} from "@/lib/studio/scheduling/status-labels";
import {
  cancelScheduledPublicationAction,
  publishNowAction,
  updateScheduledPublicationAction
} from "@/lib/studio/scheduling/scheduling-actions";
import { formatScheduledAtVietnam } from "@/lib/studio/scheduling/timezone";
import type { ScheduledPublicationListItem } from "@/types/scheduling";

type ScheduledPublicationRowProps = {
  item: ScheduledPublicationListItem;
};

function toLocalDateInput(iso: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date(iso));
}

function toLocalTimeInput(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
}

export function ScheduledPublicationRow({ item }: ScheduledPublicationRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(toLocalDateInput(item.scheduledAt));
  const [scheduleTime, setScheduleTime] = useState(toLocalTimeInput(item.scheduledAt));
  const [error, setError] = useState<string | null>(null);

  const typeLabel = TARGET_TYPE_LABELS[item.targetType];
  const title =
    item.targetType === "chapter"
      ? item.chapterTitle ??
        (item.chapterNumber ? `Chương ${item.chapterNumber}` : "Chương")
      : item.storyTitle ?? "Truyện";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-300">
              {typeLabel}
            </span>
            <span className="text-xs font-semibold text-zinc-500">
              {SCHEDULE_STATUS_LABELS[item.status]}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">{title}</h3>
          {item.storyTitle && item.targetType === "chapter" ? (
            <p className="mt-1 truncate text-sm text-zinc-400">{item.storyTitle}</p>
          ) : null}
          <p className="mt-2 text-sm text-zinc-300">
            {formatScheduledAtVietnam(item.scheduledAt)} · giờ Việt Nam
          </p>
          {item.lastError ? (
            <p className="mt-2 text-xs text-rose-300">{item.lastError}</p>
          ) : null}
        </div>

        <StudioRowActionMenu
          ariaLabel="Tùy chọn lịch đăng"
          items={[
            ...(item.status === "scheduled"
              ? [
                  {
                    type: "action" as const,
                    label: "Sửa lịch",
                    onAction: async () => {
                      setEditing(true);
                      return { ok: true };
                    }
                  },
                  {
                    type: "action" as const,
                    label: "Hủy lịch",
                    onAction: async () => {
                      const result = await cancelScheduledPublicationAction(item.id);

                      if (result.ok) {
                        startTransition(() => router.refresh());
                      }

                      return { error: result.error ?? undefined, ok: result.ok };
                    }
                  },
                  {
                    type: "action" as const,
                    label: "Đăng ngay",
                    onAction: async () => {
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
                  }
                ]
              : []),
            ...(item.draftHref
              ? [
                  {
                    type: "link" as const,
                    href: item.draftHref,
                    label: "Mở bản nháp"
                  }
                ]
              : [])
          ]}
        />
      </div>

      {editing && item.status === "scheduled" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
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
            <Button
              onClick={() => setEditing(false)}
              type="button"
              variant="secondary"
            >
              Đóng
            </Button>
          </div>
        </div>
      ) : null}

      {item.editHref ? (
        <div className="mt-4">
          <Link
            className="text-sm font-semibold text-sky-300 hover:text-sky-200"
            href={item.editHref}
          >
            Mở trong editor
          </Link>
        </div>
      ) : null}
    </article>
  );
}
