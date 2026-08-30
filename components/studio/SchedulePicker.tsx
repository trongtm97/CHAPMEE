"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  PublishChecklist,
  publishChecklistHasBlockingErrors,
  publishChecklistHasWarnings
} from "@/components/studio/PublishChecklist";
import {
  getPublishChecklistAction,
  publishNowAction,
  schedulePublicationAction
} from "@/lib/studio/scheduling/scheduling-actions";
import {
  formatSchedulePreview,
  getDefaultScheduleDateTime,
  parseVietnamScheduleInput
} from "@/lib/studio/scheduling/timezone";
import type { PublishChecklistRule } from "@/types/publish-checklist";
import type { SchedulePublishMode, ScheduledTargetType } from "@/types/scheduling";

type SchedulePickerProps = {
  targetType: ScheduledTargetType;
  targetId: string;
  storyId?: string | null;
  onScheduled?: () => void;
};

export function SchedulePicker({
  onScheduled,
  storyId,
  targetId,
  targetType
}: SchedulePickerProps) {
  const defaults = getDefaultScheduleDateTime();
  const [mode, setMode] = useState<SchedulePublishMode>("draft");
  const [scheduleDate, setScheduleDate] = useState(defaults.date);
  const [scheduleTime, setScheduleTime] = useState(defaults.time);
  const [rules, setRules] = useState<PublishChecklistRule[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasBlocking = publishChecklistHasBlockingErrors(rules);
  const hasWarnings = publishChecklistHasWarnings(rules);

  const preview = useMemo(() => {
    if (mode !== "schedule" || !scheduleDate || !scheduleTime) {
      return null;
    }

    const iso = parseVietnamScheduleInput(scheduleDate, scheduleTime);

    if (!iso) {
      return null;
    }

    return formatSchedulePreview(iso);
  }, [mode, scheduleDate, scheduleTime]);

  function refreshChecklist() {
    startTransition(async () => {
      const result = await getPublishChecklistAction({
        storyId,
        targetId,
        targetType
      });

      setRules(result.rules ?? []);
    });
  }

  function runPublishNow() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await publishNowAction({
        storyId,
        targetId,
        targetType
      });

      if (!result.ok) {
        setError(result.error ?? "Không thể đăng ngay.");
        const checklistResult = await getPublishChecklistAction({
          storyId,
          targetId,
          targetType
        });
        setRules(checklistResult.rules ?? []);
        return;
      }

      setMessage("Đã đăng thành công.");
      onScheduled?.();
    });
  }

  function runSchedule() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await schedulePublicationAction({
        scheduleDate,
        scheduleTime,
        storyId,
        targetId,
        targetType
      });

      if (!result.ok) {
        setError(result.error ?? "Không thể lên lịch đăng.");
        const checklistResult = await getPublishChecklistAction({
          storyId,
          targetId,
          targetType
        });
        setRules(checklistResult.rules ?? []);
        return;
      }

      setMessage("Đã lên lịch đăng.");
      onScheduled?.();
    });
  }

  function requestPublish(action: "publish_now" | "schedule") {
    if (hasBlocking) {
      setError("Không thể đăng cho đến khi sửa các mục bắt buộc.");
      return;
    }

    if (action === "publish_now") {
      runPublishNow();
    } else {
      runSchedule();
    }
  }

  const publishDisabled =
    isPending || hasBlocking || (mode === "publish_now" && rules.length === 0);
  const scheduleDisabled =
    isPending ||
    hasBlocking ||
    !scheduleDate ||
    !scheduleTime ||
    (mode === "schedule" && rules.length === 0);

  return (
    <>
      <Card className="space-y-4" id="lich-dang">
        <div>
          <p className="text-sm font-bold text-white">Lịch đăng</p>
          <p className="mt-1 text-xs text-zinc-500">
            Chọn cách xuất bản. Giờ hiển thị theo múi giờ Việt Nam.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { label: "Lưu nháp", value: "draft" },
              { label: "Đăng ngay", value: "publish_now" },
              { label: "Lên lịch đăng", value: "schedule" }
            ] as const
          ).map((option) => (
            <label
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                mode === option.value
                  ? "border-sky-300 bg-sky-300 text-zinc-950"
                  : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
              }`}
              key={option.value}
            >
              <input
                checked={mode === option.value}
                className="sr-only"
                name="schedule_mode"
                onChange={() => {
                  setMode(option.value);
                  if (option.value !== "draft") {
                    refreshChecklist();
                  }
                }}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>

        {mode === "schedule" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Ngày đăng"
              name="schedule_date"
              onChange={(event) => setScheduleDate(event.target.value)}
              type="date"
              value={scheduleDate}
            />
            <Input
              label="Giờ đăng"
              name="schedule_time"
              onChange={(event) => setScheduleTime(event.target.value)}
              type="time"
              value={scheduleTime}
            />
          </div>
        ) : null}

        {preview ? (
          <p className="text-sm text-sky-200">{preview}</p>
        ) : null}

        {mode !== "draft" ? <PublishChecklist rules={rules} /> : null}

        {hasBlocking && mode !== "draft" ? (
          <p className="text-xs text-rose-300">
            Không thể đăng cho đến khi sửa các mục bắt buộc.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}

        {mode === "publish_now" ? (
          <Button
            disabled={publishDisabled}
            onClick={() => requestPublish("publish_now")}
            title={
              hasBlocking
                ? "Sửa các mục bắt buộc trong checklist trước khi đăng."
                : undefined
            }
            type="button"
          >
            Đăng ngay
          </Button>
        ) : null}

        {mode === "schedule" ? (
          <Button
            disabled={scheduleDisabled}
            onClick={() => requestPublish("schedule")}
            title={
              hasBlocking
                ? "Sửa các mục bắt buộc trong checklist trước khi lên lịch."
                : undefined
            }
            type="button"
          >
            Lên lịch đăng
          </Button>
        ) : null}
      </Card>
    </>
  );
}
