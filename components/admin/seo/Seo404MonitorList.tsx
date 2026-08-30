import Link from "next/link";
import type { Seo404LogRow } from "@/lib/db/schema/seo-center";

type Seo404MonitorListProps = {
  items: Seo404LogRow[];
};

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function Seo404MonitorList({ items }: Seo404MonitorListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
        Chưa có bản ghi 404. Mở URL không tồn tại trên site public để thu thập.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-semibold">Path</th>
            <th className="px-4 py-3 font-semibold">Hits</th>
            <th className="px-4 py-3 font-semibold">First seen</th>
            <th className="px-4 py-3 font-semibold">Last seen</th>
            <th className="px-4 py-3 font-semibold">Referrer (latest)</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr className="border-b border-white/[0.04] text-zinc-300" key={row.id}>
              <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs">{row.path}</td>
              <td className="px-4 py-3 font-semibold text-amber-200">{row.hitCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                {formatDate(row.firstSeenAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                {formatDate(row.lastSeenAt)}
              </td>
              <td className="max-w-[180px] truncate px-4 py-3 text-xs text-zinc-500">
                {row.referrer ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Link
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                  href={`/admin/seo/redirects/new?source_path=${encodeURIComponent(row.path)}`}
                >
                  Tạo redirect
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
