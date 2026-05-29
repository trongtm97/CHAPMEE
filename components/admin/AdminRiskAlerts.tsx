import Link from "next/link";
import type { AdminRiskAlert } from "@/types/admin-dashboard";

type AdminRiskAlertsProps = {
  alerts: AdminRiskAlert[];
};

export function AdminRiskAlerts({ alerts }: AdminRiskAlertsProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Cảnh báo rủi ro</h2>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/20 px-4 py-6 text-center text-sm text-zinc-500">
          Chưa có cảnh báo rủi ro.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 transition hover:brightness-110 sm:flex-row sm:items-center sm:justify-between ${
                  alert.severity === "high"
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
                href={alert.href}
              >
                <span className="font-medium text-white">{alert.label}</span>
                <span className="text-sm text-zinc-400">{alert.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
