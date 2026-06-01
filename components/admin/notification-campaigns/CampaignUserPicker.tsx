"use client";

import { useEffect, useState, useTransition } from "react";
import { searchUsersForNotificationCampaignAction } from "@/lib/admin/notification-campaign-actions";
import type { CampaignUserSearchResult } from "@/types/admin-notification-campaigns";

type Props = {
  selectedIds: string[];
  selectedUsers: CampaignUserSearchResult[];
  onChange: (ids: string[], users: CampaignUserSearchResult[]) => void;
  disabled?: boolean;
};

export function CampaignUserPicker({
  selectedIds,
  selectedUsers,
  onChange,
  disabled
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CampaignUserSearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const response = await searchUsersForNotificationCampaignAction(query);
        if (!response.error) {
          setResults(response.users);
        }
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  function addUser(user: CampaignUserSearchResult) {
    if (selectedIds.includes(user.id)) {
      return;
    }
    onChange([...selectedIds, user.id], [...selectedUsers, user]);
    setQuery("");
    setResults([]);
  }

  function removeUser(userId: string) {
    onChange(
      selectedIds.filter((id) => id !== userId),
      selectedUsers.filter((user) => user.id !== userId)
    );
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-300">Tìm người dùng</span>
        <input
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-60"
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Username, display name, email hoặc user id"
          value={query}
        />
      </label>

      {pending ? <p className="text-xs text-zinc-500">Đang tìm…</p> : null}

      {results.length > 0 ? (
        <ul className="space-y-1 rounded-xl border border-white/10 bg-zinc-950/80 p-2">
          {results.map((user) => (
            <li key={user.id}>
              <button
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                disabled={disabled || selectedIds.includes(user.id)}
                onClick={() => addUser(user)}
                type="button"
              >
                <span>
                  {user.display_name || user.username || user.id}
                  {user.username ? (
                    <span className="ml-2 text-xs text-zinc-500">@{user.username}</span>
                  ) : null}
                </span>
                <span className="text-xs text-cyan-300">
                  {selectedIds.includes(user.id) ? "Đã chọn" : "Thêm"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200"
              key={user.id}
            >
              {user.display_name || user.username || user.id.slice(0, 8)}
              <button
                className="text-zinc-500 transition hover:text-red-300 disabled:opacity-50"
                disabled={disabled}
                onClick={() => removeUser(user.id)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Chưa chọn người dùng.</p>
      )}
    </div>
  );
}
