import Link from "next/link";
import { AvatarFallback } from "@/components/ui";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { ConversationActionMenu } from "@/components/messages/ConversationActionMenu";

type ConversationHeaderProps = {
  conversationId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  otherUserId: string;
  isMuted: boolean;
  blockState: "none" | "blocked_by_me" | "blocked_by_other";
};

export function ConversationHeader({
  conversationId,
  displayName,
  username,
  avatarUrl,
  otherUserId,
  isMuted,
  blockState
}: ConversationHeaderProps) {
  const statusLabel =
    blockState === "blocked_by_me"
      ? "Bạn đã chặn"
      : blockState === "blocked_by_other"
        ? "Không thể nhắn tin"
        : isMuted
          ? "Đã tắt thông báo"
          : null;

  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-1.5 border-b border-white/10 bg-[#0b1016]/95 px-1.5 py-1.5 backdrop-blur-md sm:gap-2 sm:px-2 sm:py-2">
      <Link
        aria-label="Quay lại danh sách tin nhắn"
        className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/5 active:bg-white/10 lg:hidden"
        href="/messages"
      >
        <BackIcon />
      </Link>
      {username ? (
        <Link className="shrink-0" href={getProfileUrlOrFallback(username)}>
          <AvatarFallback className="!size-10" name={displayName} size="sm" src={avatarUrl} />
        </Link>
      ) : (
        <AvatarFallback
          className="!size-10 shrink-0"
          name={displayName}
          size="sm"
          src={avatarUrl}
        />
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        {username ? (
          <Link className="block min-w-0" href={getProfileUrlOrFallback(username)}>
            <p className="truncate text-sm font-bold text-white">{displayName}</p>
            <p className="truncate text-xs text-zinc-500">
              {statusLabel ? (
                <span className="text-zinc-400">{statusLabel}</span>
              ) : (
                <>@{username}</>
              )}
            </p>
          </Link>
        ) : (
          <>
            <p className="truncate text-sm font-bold text-white">{displayName}</p>
            {statusLabel ? (
              <p className="truncate text-xs text-zinc-500">{statusLabel}</p>
            ) : null}
          </>
        )}
      </div>
      <ConversationActionMenu
        blockState={blockState}
        conversationId={conversationId}
        isMuted={isMuted}
        otherUserId={otherUserId}
        username={username}
      />
    </header>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
