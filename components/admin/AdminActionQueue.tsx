import Link from "next/link";
import type { AdminActionQueueItem } from "@/types/admin-dashboard";

type AdminActionQueueProps = {
  items: AdminActionQueueItem[];
};

const priorityStyles: Record<AdminActionQueueItem["priority"], string> = {
  high: "border-amber-500/40 bg-amber-500/10",
  medium: "border-cyan-500/30 bg-cyan-500/5",
  low: "border-white/8 bg-zinc-900/30 opacity-80"
};

export function AdminActionQueue({ items }: AdminActionQueueProps) {
  const totalPending = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Việc cần xử lý hôm nay</h2>
          <p className="text-sm text-zinc-500">Ưu tiên các hàng đợi cần admin xử lý.</p>
        </div>
        {totalPending === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200">
            Hôm nay chưa có việc cần xử lý.
          </p>
        ) : (
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{totalPending}</span> việc đang chờ
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            className={`rounded-xl border p-4 transition hover:brightness-110 ${priorityStyles[item.priority]}`}
            href={item.href}
            key={item.id}
          >
            <p
              className={`text-2xl font-bold tabular-nums ${
                item.count > 0 ? "text-white" : "text-zinc-500"
              }`}
            >
              {item.count}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-200">{item.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
