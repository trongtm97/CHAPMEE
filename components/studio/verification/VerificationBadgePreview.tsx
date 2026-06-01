"use client";

import type { UserVerificationSummary } from "@/types/verification";

type VerificationBadgePreviewProps = {
  displayName: string;
  summary: UserVerificationSummary;
};

export function VerificationBadgePreview({ displayName, summary }: VerificationBadgePreviewProps) {
  const badgeLabel = summary.publicBadge?.label ?? "Tick xanh tác giả";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Người đọc sẽ thấy</p>
      <div className="mt-3 flex items-start gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-lg font-bold text-cyan-300">
          {displayName.slice(0, 1).toUpperCase() || "T"}
        </div>
        <div>
          <p className="font-semibold text-white">{displayName || "Tác giả"}</p>
          {summary.publicBadge ? (
            <span className="mt-1 inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">
              {badgeLabel}
            </span>
          ) : (
            <span className="mt-1 inline-flex rounded-full border border-zinc-500/40 bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-400">
              Chưa có tick xanh
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Giấy tờ xác thực không hiển thị công khai. Chỉ badge và hồ sơ tác giả được người đọc nhìn thấy.
      </p>
    </div>
  );
}
