"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { searchAdminUsers } from "@/lib/admin/get-users";
import type { AdminUserSearchResult } from "@/lib/admin/get-users";

type Props = {
  label?: string;
  selected: AdminUserSearchResult | null;
  onSelect: (user: AdminUserSearchResult | null) => void;
  disabled?: boolean;
};

export function UserPickerField({
  label = "Chọn user",
  selected,
  onSelect,
  disabled
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function search() {
    startTransition(async () => {
      const res = await searchAdminUsers({ query, page: 1, pageSize: 8 });
      setResults(res.users);
    });
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-400">{label}</span>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-sm">
          <span className="text-white">
            {selected.display_name ?? selected.username ?? selected.id}
            {selected.username ? (
              <span className="text-zinc-400"> @{selected.username}</span>
            ) : null}
          </span>
          <button
            className="text-xs text-zinc-400 hover:text-white"
            disabled={disabled}
            onClick={() => onSelect(null)}
            type="button"
          >
            Đổi
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              disabled={disabled || isPending}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Tìm username, tên hiển thị hoặc user id..."
              value={query}
            />
            <Button disabled={disabled || isPending} onClick={search} type="button" variant="ghost">
              Tìm
            </Button>
          </div>
          {results.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-1">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-white/5"
                    onClick={() => {
                      onSelect(user);
                      setResults([]);
                    }}
                    type="button"
                  >
                    {user.display_name ?? user.username ?? user.id}
                    {user.username ? (
                      <span className="text-zinc-500"> @{user.username}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
