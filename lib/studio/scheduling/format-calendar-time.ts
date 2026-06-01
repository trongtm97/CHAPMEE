import { STUDIO_DEFAULT_TIMEZONE } from "@/types/scheduling";

const VN_TZ = STUDIO_DEFAULT_TIMEZONE;

function vnDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: VN_TZ,
    year: "numeric"
  });

  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return { day, month, year };
}

export function isSameVnDay(a: Date, b: Date) {
  const pa = vnDateParts(a);
  const pb = vnDateParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function formatFriendlyScheduleTime(iso: string, now = new Date()) {
  const target = new Date(iso);

  if (!Number.isFinite(target.getTime())) {
    return iso;
  }

  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: VN_TZ
  }).format(target);

  if (isSameVnDay(target, now)) {
    return `Hôm nay, ${time}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameVnDay(target, tomorrow)) {
    return `Mai, ${time}`;
  }

  const date = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: VN_TZ,
    year: "numeric"
  }).format(target);

  return `${date}, ${time}`;
}

export function isScheduledToday(iso: string, now = new Date()) {
  return isSameVnDay(new Date(iso), now);
}

export function isWithinNextDays(iso: string, days: number, now = new Date()) {
  const target = new Date(iso).getTime();
  const start = now.getTime();
  const end = start + days * 24 * 60 * 60 * 1000;
  return target >= start && target <= end;
}

export function isInCurrentVnMonth(iso: string, now = new Date()) {
  const target = vnDateParts(new Date(iso));
  const current = vnDateParts(now);
  return target.year === current.year && target.month === current.month;
}

export function isPublishedWithinDays(
  publishedAt: string | null,
  days: number,
  now = new Date()
) {
  if (!publishedAt) {
    return false;
  }

  const published = new Date(publishedAt).getTime();
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return published >= cutoff;
}
