"use client";

import { AvatarFallback, Button, Card } from "@/components/ui";
import type { CoinAdminUserRow } from "@/types/coins";

type UserCoinSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  results: CoinAdminUserRow[];
  selectedId: string | null;
  onSelect: (user: CoinAdminUserRow) => void;
  onAdjust: (user: CoinAdminUserRow) => void;
  searching: boolean;
};

function statusLabel(status: string) {
  if (status === "active") return "Hoạt động";
  if (status === "banned") return "Đã khóa";
  if (status === "suspended") return "Tạm khóa";
  return status;
}

export function UserCoinSearch({
  query,
  onQueryChange,
  onSearch,
  results,
  selectedId,
  onSelect,
  onAdjust,
  searching
}: UserCoinSearchProps) {
  return (
    <Card className="space-y-4">
      <p className="text-sm font-semibold text-white">Tìm kiếm user</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
          placeholder="Username, email, tên hiển thị hoặc user id…"
          value={query}
        />
        <Button disabled={searching} onClick={onSearch} type="button">
          {searching ? "Đang tìm…" : "Tìm user"}
        </Button>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có kết quả. Nhập từ khóa và bấm Tìm user.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Coin nạp</th>
                <th className="px-3 py-2">Coin thưởng</th>
                <th className="px-3 py-2">Tổng</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {results.map((user) => {
                const selected = selectedId === user.id;
                return (
                  <tr
                    className={`border-t border-white/5 ${selected ? "bg-cyan-300/10" : ""}`}
                    key={user.id}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AvatarFallback
                          name={user.display_name ?? user.username ?? user.id}
                          size="sm"
                          src={user.avatar_url}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100">
                            {user.display_name ?? user.username ?? "—"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            @{user.username ?? user.id.slice(0, 8)}
                            {user.email ? ` · ${user.email}` : ""}
                          </p>
                          <p className="text-xs text-zinc-600">{statusLabel(user.status)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-200">
                      {user.paidCoin.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-zinc-200">
                      {user.bonusCoin.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 font-semibold text-white">
                      {user.totalCoin.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          onClick={() => onSelect(user)}
                          type="button"
                          variant={selected ? "primary" : "ghost"}
                        >
                          Xem ví
                        </Button>
                        <Button onClick={() => onAdjust(user)} type="button" variant="ghost">
                          Điều chỉnh
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
