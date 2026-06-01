"use client";

import Link from "next/link";
import type { AdminAdFraudSignalRow } from "@/lib/creator-ad-revenue/list-fraud-signals-admin";
import { creatorPublicProfilePath } from "@/types/creator-ad-revenue-policy";

type FraudSignalsTableProps = {
  signals: AdminAdFraudSignalRow[];
};

export function FraudSignalsTable({ signals }: FraudSignalsTableProps) {
  if (signals.length === 0) {
    return <p className="text-sm text-zinc-500">Không có tín hiệu fraud đang mở.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2">Rule</th>
            <th className="px-3 py-2">Mức</th>
            <th className="px-3 py-2">Tác giả</th>
            <th className="px-3 py-2">Tháng</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr className="border-b border-white/5" key={s.id}>
              <td className="px-3 py-2 font-mono text-xs">{s.rule_key}</td>
              <td className="px-3 py-2">{s.severity}</td>
              <td className="px-3 py-2">
                {s.author_id ? (
                  <Link
                    className="text-cyan-300 hover:underline"
                    href={creatorPublicProfilePath(s.username, s.author_id)}
                  >
                    @{s.username ?? s.author_id.slice(0, 8)}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">{s.month ?? "—"}</td>
              <td className="px-3 py-2">{s.status}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {new Date(s.created_at).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
