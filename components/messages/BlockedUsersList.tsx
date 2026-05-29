"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AvatarFallback, Button, Card } from "@/components/ui";
import { MessageToast } from "@/components/messages/MessageToast";
import { unblockUserAction } from "@/lib/actions/messages";
import type { BlockedUserItem } from "@/lib/messages/get-blocked-users";

const UNBLOCK_CONFIRM =
  "Bạn có chắc muốn bỏ chặn người dùng này? Họ có thể nhắn tin lại theo quy tắc quyền riêng tư của bạn.";

function formatBlockedDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium"
  }).format(new Date(iso));
}

type BlockedUsersListProps = {
  users: BlockedUserItem[];
};

export function BlockedUsersList({ users }: BlockedUsersListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-bold text-white">Người đã chặn</h2>
        {!users.length ? (
          <p className="text-sm text-zinc-500">Bạn chưa chặn ai.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                className="flex items-center justify-between gap-2 rounded-xl border border-white/5 px-2 py-2"
                key={user.blockedId}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarFallback name={user.displayName} size="sm" src={user.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{user.displayName}</p>
                    {user.username ? (
                      <p className="truncate text-xs text-zinc-500">@{user.username}</p>
                    ) : null}
                    <p className="text-[10px] text-zinc-600">
                      Chặn {formatBlockedDate(user.blockedAt)}
                    </p>
                  </div>
                </div>
                <Button
                  className="shrink-0 text-xs normal-case tracking-normal"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(UNBLOCK_CONFIRM)) {
                      return;
                    }
                    startTransition(async () => {
                      const result = await unblockUserAction(user.blockedId);
                      if (result.ok) {
                        setToast("Đã bỏ chặn.");
                        router.refresh();
                      }
                    });
                  }}
                  type="button"
                  variant="ghost"
                >
                  Bỏ chặn
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <MessageToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
