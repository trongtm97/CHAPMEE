export function InboxListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải danh sách tin nhắn"
      className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          className="flex items-center gap-3 border-b border-white/5 px-3 py-3.5 last:border-0"
          key={i}
        >
          <div className="size-12 shrink-0 rounded-full bg-white/5" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="h-3.5 w-28 rounded-md bg-white/5" />
              <div className="h-2.5 w-10 rounded bg-white/5" />
            </div>
            <div className="h-3 w-full max-w-[12rem] rounded bg-white/5" />
          </div>
          <div className="size-5 shrink-0 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải cuộc trò chuyện"
      className="flex h-full min-h-0 flex-1 flex-col animate-pulse"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2 py-2.5">
        <div className="size-10 rounded-full bg-white/5 lg:hidden" />
        <div className="size-9 rounded-full bg-white/5" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-32 rounded-md bg-white/5" />
          <div className="h-2.5 w-20 rounded bg-white/5" />
        </div>
        <div className="size-10 rounded-full bg-white/5" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 px-3 py-4">
        <div className="mr-auto h-10 w-[58%] max-w-[16rem] rounded-2xl rounded-bl-md bg-white/5" />
        <div className="ml-auto h-12 w-[72%] max-w-[18rem] rounded-2xl rounded-br-md bg-white/5" />
        <div className="ml-auto h-9 w-[45%] max-w-[12rem] rounded-2xl rounded-br-md bg-white/5" />
      </div>
      <div className="shrink-0 border-t border-white/10 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-end gap-2">
          <div className="h-11 min-h-11 flex-1 rounded-2xl bg-white/5" />
          <div className="h-11 w-16 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
