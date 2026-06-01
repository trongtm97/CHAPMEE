"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Card } from "@/components/ui";
import { coldStartAdminAction } from "@/lib/admin/cold-start-actions";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import type { ColdStartDashboardData } from "@/types/cold-start";

type ColdStartAdminDashboardProps = {
  data: ColdStartDashboardData;
};

export function ColdStartAdminDashboard({ data }: ColdStartAdminDashboardProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            Quota thử nghiệm ban đầu cho truyện/Reels/tác giả mới — chống spam, nâng growth khi qualify.
          </p>
        </div>
        <Link
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-white/20"
          href="/admin/algorithm?tab=cold_start"
        >
          Chỉnh settings
        </Link>
      </div>

      {data.error ? (
        <Card className="border-amber-400/30 bg-amber-500/5 text-amber-100">{data.error}</Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Tests đang chạy" value={String(data.activeCount)} />
        <StatCard label="Qualified" value={String(data.qualifiedCount)} />
        <StatCard label="Failed" value={String(data.failedCount)} />
        <StatCard label="Tác giả mới đang test" value={String(data.newAuthorsTesting)} />
        <StatCard
          label="Impressions đã cấp"
          value={data.totalImpressionsDelivered.toLocaleString("vi-VN")}
        />
        <StatCard
          label="Tỷ lệ qualified"
          value={`${data.qualificationRate.toFixed(1)}%`}
        />
      </section>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-3">Tiêu đề</th>
              <th className="px-3 py-3">Tác giả</th>
              <th className="px-3 py-3">Loại</th>
              <th className="px-3 py-3">Target</th>
              <th className="px-3 py-3">Delivered</th>
              <th className="px-3 py-3">Completion</th>
              <th className="px-3 py-3">Report</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr className="border-b border-white/5" key={item.id}>
                <td className="max-w-[180px] truncate px-3 py-3 font-medium text-white">
                  {item.title}
                </td>
                <td className="px-3 py-3">
                  <Link
                    className="text-cyan-200 hover:underline"
                    href={getProfileUrlOrFallback(item.authorUsername)}
                  >
                    {item.authorDisplayName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-zinc-400">{item.itemType}</td>
                <td className="px-3 py-3 text-zinc-300">{item.targetImpressions}</td>
                <td className="px-3 py-3 text-zinc-300">{item.deliveredImpressions}</td>
                <td className="px-3 py-3 text-zinc-400">
                  {(item.completionRate * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-3 text-zinc-400">
                  {(item.reportRate * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.status === "active" ? (
                      <ActionButton
                        disabled={pending}
                        label="Pause"
                        onClick={() =>
                          startTransition(async () => {
                            await coldStartAdminAction(item.id, "pause");
                            window.location.reload();
                          })
                        }
                      />
                    ) : null}
                    {item.status === "paused" ? (
                      <ActionButton
                        disabled={pending}
                        label="Resume"
                        onClick={() =>
                          startTransition(async () => {
                            await coldStartAdminAction(item.id, "resume");
                            window.location.reload();
                          })
                        }
                      />
                    ) : null}
                    {["active", "paused"].includes(item.status) ? (
                      <>
                        <ActionButton
                          disabled={pending}
                          label="Qualify"
                          onClick={() =>
                            startTransition(async () => {
                              await coldStartAdminAction(item.id, "force_qualify");
                              window.location.reload();
                            })
                          }
                        />
                        <ActionButton
                          disabled={pending}
                          label="Stop"
                          onClick={() =>
                            startTransition(async () => {
                              await coldStartAdminAction(item.id, "stop");
                              window.location.reload();
                            })
                          }
                        />
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "qualified"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : status === "failed"
        ? "border-red-400/30 bg-red-500/10 text-red-100"
        : status === "paused"
          ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
          : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${tone}`}>
      {status}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-zinc-300 hover:border-white/20 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
