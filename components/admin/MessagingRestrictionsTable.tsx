"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { revokeMessagingRestrictionAction } from "@/lib/admin/messaging-safety-actions";
import {
  MESSAGING_RESTRICT_REASON_LABELS,
  MESSAGING_RESTRICTION_LABELS
} from "@/lib/messaging/labels";
import type { MessagingRestrictionItem } from "@/types/messaging-safety";

type Props = {
  restrictions: MessagingRestrictionItem[];
  moderatorId: string;
};

export function MessagingRestrictionsTable({ restrictions, moderatorId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!restrictions.length) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-400">
        Không có hạn chế nhắn tin đang hoạt động.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {restrictions.map((row) => (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm" key={row.id}>
          <div>
            <p className="font-medium text-white">
              {row.displayName}
              {row.username ? (
                <span className="ml-1 text-zinc-500">@{row.username}</span>
              ) : null}
            </p>
            <p className="text-xs text-zinc-500">
              {MESSAGING_RESTRICTION_LABELS[row.restrictionType]} ·{" "}
              {MESSAGING_RESTRICT_REASON_LABELS[
                row.reasonCode as keyof typeof MESSAGING_RESTRICT_REASON_LABELS
              ] ?? row.reasonCode}
            </p>
            <p className="text-xs text-zinc-600">
              Bắt đầu {new Date(row.startsAt).toLocaleString("vi-VN")}
              {row.endsAt
                ? ` · Kết thúc ${new Date(row.endsAt).toLocaleString("vi-VN")}`
                : " · Không giới hạn"}
              {row.createdByName ? ` · Admin: ${row.createdByName}` : ""}
            </p>
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await revokeMessagingRestrictionAction({
                  moderatorId,
                  restrictionId: row.id
                });
                router.refresh();
              })
            }
            type="button"
            variant="secondary"
          >
            Gỡ hạn chế
          </Button>
        </Card>
      ))}
    </div>
  );
}
