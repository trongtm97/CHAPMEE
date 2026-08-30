import Link from "next/link";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import {
  getSecurityEventsPaged,
  getSecurityEventStats,
  getTopSuspiciousIpHashes,
  getTopSuspiciousUserAgents
} from "@/lib/security/security-events";

type SecurityEventsPanelProps = {
  page?: number;
  eventType?: string;
};

export async function SecurityEventsPanel({ page = 1, eventType }: SecurityEventsPanelProps) {
  const [paged, stats, topIpHashes, topUserAgents] = await Promise.all([
    getSecurityEventsPaged({ page, pageSize: 20, eventType }),
    getSecurityEventStats(24),
    getTopSuspiciousIpHashes({ sinceHours: 24, limit: 10 }),
    getTopSuspiciousUserAgents({ sinceHours: 24, limit: 10 })
  ]);

  const hasTable = paged.items.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Sự kiện 24h</h2>
        {stats.byType.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Chưa có sự kiện.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {stats.byType.map((row) => (
              <li className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm" key={row.event_type}>
                <Link
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                  href={`/admin/security/crawl-protection?eventType=${encodeURIComponent(row.event_type)}`}
                >
                  {row.event_type}
                </Link>
                <span className="text-zinc-500"> — {row.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Top path (24h)</h2>
        <ul className="mt-2 space-y-1 text-sm text-zinc-400">
          {stats.topPaths.length === 0 ? (
            <li className="text-zinc-500">—</li>
          ) : (
            stats.topPaths.map((row) => (
              <li key={row.path}>
                {row.path} <span className="text-zinc-600">({row.total})</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-lg font-bold text-zinc-100">Top IP hash (24h)</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {topIpHashes.length === 0 ? (
              <li className="text-zinc-500">—</li>
            ) : (
              topIpHashes.map((row) => (
                <li key={row.ipHash}>
                  <span className="font-mono text-[11px] text-zinc-300">
                    {row.ipHash ? `${row.ipHash.slice(0, 14)}…` : "—"}
                  </span>{" "}
                  <span className="text-zinc-600">({row.total})</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-lg font-bold text-zinc-100">Top user agent (24h)</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {topUserAgents.length === 0 ? (
              <li className="text-zinc-500">—</li>
            ) : (
              topUserAgents.map((row) => (
                <li key={row.userAgent}>
                  <span className="truncate text-zinc-300">{row.userAgent}</span>{" "}
                  <span className="text-zinc-600">({row.total})</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {hasTable ? (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-lg font-bold text-zinc-100">Sự kiện gần đây</h2>
          {eventType ? (
            <p className="mt-1 text-xs text-zinc-500">
              Lọc: <span className="text-cyan-300">{eventType}</span>
              {" · "}
              <Link className="text-cyan-400" href="/admin/security/crawl-protection">
                Xóa lọc
              </Link>
            </p>
          ) : null}
          {paged.items.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Không có sự kiện.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Loại</th>
                    <th className="py-2 pr-3">Path</th>
                    <th className="py-2 pr-3">IP hash</th>
                    <th className="py-2 pr-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-400">
                  {paged.items.map((event) => (
                    <tr key={event.id}>
                      <td className="py-2 pr-3 font-semibold text-zinc-300">{event.event_type}</td>
                      <td className="max-w-[12rem] truncate py-2 pr-3">{event.path ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono text-[10px]">
                        {event.ip_hash ? `${event.ip_hash.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="py-2 pr-3">{event.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <AdminListPagination
              basePath="/admin/security/crawl-protection"
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              totalPages={paged.totalPages}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
