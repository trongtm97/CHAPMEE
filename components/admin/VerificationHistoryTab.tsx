"use client";

import type { VerificationHistoryEntry } from "@/types/admin-verification";

type Props = {
  history: VerificationHistoryEntry[];
};

export function VerificationHistoryTab({ history }: Props) {
  if (history.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có lịch sử.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-white/10 pl-4">
      {history.map((entry) => (
        <li className="text-sm" key={entry.id}>
          <p className="font-medium text-white">{entry.action}</p>
          <p className="text-xs text-zinc-500">
            {new Date(entry.createdAt).toLocaleString("vi-VN")}
            {entry.actorName ? ` · ${entry.actorName}` : ""}
          </p>
          {entry.note ? <p className="mt-1 text-zinc-400">{entry.note}</p> : null}
          {entry.oldValue || entry.newValue ? (
            <p className="mt-1 text-xs text-zinc-600">
              {entry.oldValue ? `Từ: ${entry.oldValue}` : ""}
              {entry.newValue ? ` → ${entry.newValue}` : ""}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
