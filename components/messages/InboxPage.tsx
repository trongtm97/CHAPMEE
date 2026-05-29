"use client";

import { useSearchParams } from "next/navigation";

/** Nội dung tab inbox trên mobile; desktop dùng sidebar trong MessagesShell. */
export function InboxPage() {
  const searchParams = useSearchParams();
  const sent = searchParams.get("sent");

  if (sent === "1") {
    return (
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100 lg:hidden">
        Đã gửi yêu cầu tin nhắn. Người nhận sẽ xem trong tab Yêu cầu.
      </div>
    );
  }

  return (
    <p className="text-center text-xs text-zinc-500 lg:hidden">
      Chọn cuộc trò chuyện hoặc tab Yêu cầu ở trên.
    </p>
  );
}
