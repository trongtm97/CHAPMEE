import { InboxItem } from "@/components/messages/InboxItem";
import type { InboxConversationItem } from "@/types/messages";

type InboxListProps = {
  items: InboxConversationItem[];
  activeConversationId?: string | null;
};

export function InboxEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-zinc-200">Chưa có tin nhắn.</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        Khi có người nhắn cho bạn, cuộc trò chuyện sẽ xuất hiện tại đây.
      </p>
    </div>
  );
}

export function InboxList({ items, activeConversationId }: InboxListProps) {
  if (!items.length) {
    return <InboxEmptyState />;
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {items.map((item) => (
        <li className="border-b border-white/5 last:border-0" key={item.id}>
          <InboxItem active={activeConversationId === item.id} item={item} />
        </li>
      ))}
    </ul>
  );
}
