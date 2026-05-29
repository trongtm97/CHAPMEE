import { STUDIO_DEFAULT_TIMEZONE } from "@/types/scheduling";

export function formatScheduledAtVietnam(iso: string, timeZone = STUDIO_DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).format(new Date(iso));
}

export function formatSchedulePreview(
  scheduledAtIso: string,
  timeZone = STUDIO_DEFAULT_TIMEZONE
) {
  const formatted = formatScheduledAtVietnam(scheduledAtIso, timeZone);
  return `Sẽ đăng lúc ${formatted} theo giờ Việt Nam.`;
}

/** Parse date + time inputs (local VN fields) to UTC ISO. */
export function parseVietnamScheduleInput(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    month: "numeric",
    timeZone: STUDIO_DEFAULT_TIMEZONE,
    year: "numeric"
  });

  const parts = formatter.formatToParts(utcGuess);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const vnAsUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute")
  );

  const offsetMs = utcGuess.getTime() - vnAsUtc;
  return new Date(utcGuess.getTime() + offsetMs).toISOString();
}

export function getDefaultScheduleDateTime() {
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 60 * 1000);

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(future);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDIO_DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(future);

  return { date, time };
}
