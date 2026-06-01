import type { StudioAnalyticsRange } from "@/types/studio-analytics";

const MS_DAY = 24 * 60 * 60 * 1000;

export function startOfTodayMs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function startOfMonthMs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export type AnalyticsRangeBounds = {
  currentStart: string | null;
  currentEnd: string;
  previousStart: string | null;
  previousEnd: string | null;
  dayCount: number;
};

export function getAnalyticsRangeBounds(
  range: StudioAnalyticsRange
): AnalyticsRangeBounds {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  if (range === "all") {
    return {
      currentStart: null,
      currentEnd: nowIso,
      previousStart: null,
      previousEnd: null,
      dayCount: 30
    };
  }

  if (range === "today") {
    const startMs = startOfTodayMs();
    return {
      currentStart: new Date(startMs).toISOString(),
      currentEnd: nowIso,
      previousStart: new Date(startMs - MS_DAY).toISOString(),
      previousEnd: new Date(startMs).toISOString(),
      dayCount: 1
    };
  }

  if (range === "month") {
    const startMs = startOfMonthMs();
    const span = nowMs - startMs;
    return {
      currentStart: new Date(startMs).toISOString(),
      currentEnd: nowIso,
      previousStart: new Date(startMs - span).toISOString(),
      previousEnd: new Date(startMs).toISOString(),
      dayCount: Math.max(1, Math.ceil(span / MS_DAY))
    };
  }

  const days = range === "7d" ? 7 : 30;
  const startMs = nowMs - days * MS_DAY;

  return {
    currentStart: new Date(startMs).toISOString(),
    currentEnd: nowIso,
    previousStart: new Date(startMs - days * MS_DAY).toISOString(),
    previousEnd: new Date(startMs).toISOString(),
    dayCount: days
  };
}

export function formatDayKey(iso: string) {
  return iso.slice(0, 10);
}

export function formatDayLabel(dayKey: string) {
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}`;
}

export function fillTimelineDays(
  values: Map<string, number>,
  bounds: AnalyticsRangeBounds
) {
  const points: Array<{ date: string; label: string; value: number }> = [];

  if (!bounds.currentStart) {
    const sorted = [...values.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const last = sorted.slice(-14);

    for (const [date, value] of last) {
      points.push({ date, label: formatDayLabel(date), value });
    }

    return points;
  }

  const startMs = new Date(bounds.currentStart).getTime();
  const endMs = Date.now();

  for (let cursor = startMs; cursor <= endMs; cursor += MS_DAY) {
    const key = formatDayKey(new Date(cursor).toISOString());
    points.push({
      date: key,
      label: formatDayLabel(key),
      value: values.get(key) ?? 0
    });
  }

  return points.slice(-Math.min(bounds.dayCount, 31));
}

export function fillEngagementTimeline(
  saves: Map<string, number>,
  comments: Map<string, number>,
  follows: Map<string, number>,
  bounds: AnalyticsRangeBounds
) {
  const keys = new Set([
    ...saves.keys(),
    ...comments.keys(),
    ...follows.keys()
  ]);

  if (!bounds.currentStart) {
    const sorted = [...keys].sort();
    const last = sorted.slice(-14);

    return last.map((date) => ({
      date,
      label: formatDayLabel(date),
      saves: saves.get(date) ?? 0,
      comments: comments.get(date) ?? 0,
      follows: follows.get(date) ?? 0
    }));
  }

  const startMs = new Date(bounds.currentStart).getTime();
  const endMs = Date.now();
  const points: Array<{
    date: string;
    label: string;
    saves: number;
    comments: number;
    follows: number;
  }> = [];

  for (let cursor = startMs; cursor <= endMs; cursor += MS_DAY) {
    const key = formatDayKey(new Date(cursor).toISOString());
    points.push({
      date: key,
      label: formatDayLabel(key),
      saves: saves.get(key) ?? 0,
      comments: comments.get(key) ?? 0,
      follows: follows.get(key) ?? 0
    });
  }

  return points.slice(-Math.min(bounds.dayCount, 31));
}

export function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function deltaLabel(percent: number | null): string {
  if (percent === null) {
    return "Chưa đủ dữ liệu so sánh";
  }

  if (percent > 0) {
    return `+${percent}% so với kỳ trước`;
  }

  if (percent < 0) {
    return `${percent}% so với kỳ trước`;
  }

  return "Không đổi so với kỳ trước";
}

export function incrementDayMap(map: Map<string, number>, iso: string) {
  const key = formatDayKey(iso);
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function isInRange(
  iso: string,
  start: string | null,
  end: string | null
) {
  const time = new Date(iso).getTime();

  if (start && time < new Date(start).getTime()) {
    return false;
  }

  if (end && time >= new Date(end).getTime()) {
    return false;
  }

  return true;
}
