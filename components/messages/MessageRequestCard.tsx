"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AvatarFallback, Button } from "@/components/ui";
import { formatInboxTime } from "@/lib/messages/format-message-time";
import {
  acceptRequestAction,
  blockRequestAction,
  rejectRequestAction
} from "@/lib/actions/messages";
import { ReportMessageRequestDialog } from "@/components/messages/ReportMessageRequestDialog";
import { getProfileUrl } from "@/lib/profile/profile-url";
import type { MessageRequestItem } from "@/types/messages";

type MessageRequestCardProps = {
  request: MessageRequestItem;
};

export function MessageRequestCard({ request }: MessageRequestCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleResult(result: { ok: boolean; error?: string }) {
    if (!result.ok && result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  const profileHref = getProfileUrl(request.requester.username);

  return (
    <>
      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          {profileHref ? (
            <Link className="shrink-0" href={profileHref}>
              <AvatarFallback
                name={request.requester.displayName}
                size="md"
                src={request.requester.avatarUrl}
              />
            </Link>
          ) : (
            <AvatarFallback
              name={request.requester.displayName}
              size="md"
              src={request.requester.avatarUrl}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {profileHref ? (
                  <Link className="block truncate text-sm font-semibold text-white hover:text-cyan-200" href={profileHref}>
                    {request.requester.displayName}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-white">
                    {request.requester.displayName}
                  </p>
                )}
                {request.requester.username ? (
                  <p className="text-xs text-zinc-500">@{request.requester.username}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
                {formatInboxTime(request.createdAt)}
              </span>
            </div>
            <p className="mt-2 line-clamp-4 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm leading-relaxed text-zinc-200">
              {request.firstMessage}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-amber-400/15 bg-amber-400/5 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100/90">
          Chỉ chấp nhận tin nhắn từ người bạn tin tưởng.
        </p>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            className="min-h-10 normal-case tracking-normal"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await acceptRequestAction(request.id);
              })
            }
            type="button"
          >
            Chấp nhận
          </Button>
          <Button
            className="min-h-10 normal-case tracking-normal"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await rejectRequestAction(request.id);
                handleResult(result);
              })
            }
            type="button"
            variant="secondary"
          >
            Từ chối
          </Button>
          <Button
            className="min-h-10 normal-case tracking-normal"
            disabled={pending}
            onClick={() => setReportOpen(true)}
            type="button"
            variant="ghost"
          >
            Báo cáo
          </Button>
          <Button
            className="min-h-10 normal-case tracking-normal"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await blockRequestAction(request.id);
                handleResult(result);
              })
            }
            type="button"
            variant="ghost"
          >
            Chặn
          </Button>
        </div>
      </article>
      {reportOpen ? (
        <ReportMessageRequestDialog
          onClose={() => {
            setReportOpen(false);
            router.refresh();
          }}
          reportedUserId={request.requester.id}
          requestId={request.id}
        />
      ) : null}
    </>
  );
}
