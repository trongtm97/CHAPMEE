"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { filterTasksByCategory } from "@/lib/reels/reels-studio-utils";
import type { ReelsTaskCategory, ReelsTaskItem } from "@/types/reels";
import { reelsBtnCompactPrimary } from "@/components/studio/reels/management/shared/styles";

const PILLS: Array<{ label: string; value: ReelsTaskCategory }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Cần sửa", value: "needs_fix" },
  { label: "Hiệu quả thấp", value: "low_performance" },
  { label: "Sắp đăng", value: "upcoming" }
];

type StudioReelsTodayPanelProps = {
  allTasks: ReelsTaskItem[];
  basePath: string;
};

export function StudioReelsTodayPanel({ allTasks, basePath }: StudioReelsTodayPanelProps) {
  const [category, setCategory] = useState<ReelsTaskCategory>("all");

  const filtered = useMemo(
    () => filterTasksByCategory(allTasks, category).slice(0, 5),
    [allTasks, category]
  );

  const totalFiltered = filterTasksByCategory(allTasks, category).length;

  if (allTasks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white sm:text-base">Hôm nay cần làm gì?</h2>
        {totalFiltered > 5 ? (
          <Link
            className="text-xs font-semibold text-cyan-300 hover:underline"
            href={buildStudioManagerHref(basePath, { sort: "needs_attention" })}
          >
            Xem tất cả ({totalFiltered})
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5">
          {PILLS.map((pill) => (
            <button
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                category === pill.value
                  ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
                  : "border-white/10 text-zinc-400 hover:border-white/20"
              }`}
              key={pill.value}
              onClick={() => setCategory(pill.value)}
              type="button"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">Không có việc trong nhóm này. Tuyệt vời!</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((task) => (
            <li
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={task.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{task.description}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Link className={reelsBtnCompactPrimary} href={task.primaryAction.href}>
                  {task.primaryAction.label}
                </Link>
                {task.secondaryAction ? (
                  <Link
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200"
                    href={task.secondaryAction.href}
                  >
                    {task.secondaryAction.label}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
