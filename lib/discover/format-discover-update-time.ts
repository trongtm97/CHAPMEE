import { formatRelativeTime } from "@/lib/notifications/format-relative-time";

/**
 * Recent: relative ("5 phút trước").
 * Same day (≥1h): "Hôm nay 22:10".
 * Older: "02/06/2026".
 */
export function formatDiscoverUpdateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Vừa xong";
  }

  const now = new Date();
  const ageMs = now.getTime() - date.getTime();
  const ageHours = ageMs / 3_600_000;

  if (date.toDateString() === now.toDateString()) {
    if (ageHours < 1) {
      return formatRelativeTime(iso);
    }
    const clock = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    return `Hôm nay ${clock}`;
  }

  if (ageHours < 48) {
    return formatRelativeTime(iso);
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
