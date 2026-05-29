"use client";

import { AvatarFallback, Button, Card } from "@/components/ui";
import type { RiskyMessageUser } from "@/types/admin-messaging";

type RiskyMessageUsersTableProps = {
  users: RiskyMessageUser[];
  onSelectUser: (userId: string) => void;
};

export function RiskyMessageUsersTable({
  users,
  onSelectUser
}: RiskyMessageUsersTableProps) {
  if (!users.length) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-400">
        Không có người dùng rủi ro đáng chú ý với bộ lọc hiện tại.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">Điểm rủi ro</th>
              <th className="px-3 py-2.5 font-medium">Users</th>
              <th className="px-3 py-2.5 font-medium">Báo cáo (7 ngày)</th>
              <th className="px-3 py-2.5 font-medium">Bị lọc chặn</th>
              <th className="px-3 py-2.5 font-medium">Yêu cầu (24h)</th>
              <th className="px-3 py-2.5 font-medium">Bị chặn bởi user</th>
              <th className="px-3 py-2.5 font-medium">Tuổi TK</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                key={user.userId}
              >
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-1 text-xs font-black tabular-nums ${
                      user.riskScore >= 20
                        ? "bg-red-400/15 text-red-200"
                        : user.riskScore >= 10
                          ? "bg-amber-400/12 text-amber-100"
                          : "bg-cyan-400/10 text-cyan-100"
                    }`}
                  >
                    {user.riskScore}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <AvatarFallback
                      className="!size-9"
                      name={user.displayName}
                      size="sm"
                      src={user.avatarUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100">
                        {user.displayName}
                      </p>
                      {user.username ? (
                        <p className="truncate text-xs text-zinc-500">@{user.username}</p>
                      ) : null}
                      {user.activeRestriction ? (
                        <p className="mt-0.5 text-[10px] text-amber-300/90">
                          {user.activeRestriction}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 tabular-nums text-zinc-300">{user.openReports7d}</td>
                <td className="px-3 py-3 tabular-nums text-zinc-300">
                  {user.safetyBlockedCount}
                </td>
                <td className="px-3 py-3 tabular-nums text-zinc-300">{user.requests24h}</td>
                <td className="px-3 py-3 tabular-nums text-zinc-300">
                  {user.blocksReceived}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-500">
                  {user.accountAgeHours < 24
                    ? "Mới (<24h)"
                    : `${Math.round(user.accountAgeHours / 24)} ngày`}
                </td>
                <td className="px-3 py-3">
                  <Button
                    className="text-xs normal-case tracking-normal"
                    onClick={() => onSelectUser(user.userId)}
                    type="button"
                    variant="secondary"
                  >
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
