import { MessageRequestCard } from "@/components/messages/MessageRequestCard";
import type { MessageRequestItem } from "@/types/messages";

type MessageRequestListProps = {
  requests: MessageRequestItem[];
};

export function MessageRequestList({ requests }: MessageRequestListProps) {
  if (!requests.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center">
        <p className="text-sm font-semibold text-zinc-200">Không có yêu cầu nhắn tin.</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Khi có người lạ nhắn cho bạn, yêu cầu sẽ hiển thị tại đây trước khi vào hộp
          thư chính.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="px-0.5 text-xs text-zinc-500">
        {requests.length} yêu cầu đang chờ
      </p>
      {requests.map((request) => (
        <MessageRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
