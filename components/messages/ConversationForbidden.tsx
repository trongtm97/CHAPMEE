import Link from "next/link";

export function ConversationForbidden() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-base font-semibold text-zinc-200">
        Bạn không có quyền xem cuộc trò chuyện này.
      </p>
      <p className="mt-2 max-w-xs text-sm text-zinc-500">
        Cuộc trò chuyện không tồn tại hoặc bạn không phải thành viên.
      </p>
      <Link
        className="tap-highlight mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-bold text-zinc-950"
        href="/messages"
      >
        Về tin nhắn
      </Link>
    </div>
  );
}
