import Link from "next/link";
import { AvatarFallback } from "@/components/ui";
import type { AuthorReplyItem } from "@/types/community";

type AuthorReplySectionProps = {
  items: AuthorReplyItem[];
};

export function AuthorReplySection({ items }: AuthorReplySectionProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-zinc-100">Tác giả đang trả lời</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            className="chap-card flex items-center gap-3 p-3 transition hover:border-cyan-300/25"
            href={`/community/${item.postId}`}
            key={item.id}
          >
            <AvatarFallback name={item.authorName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{item.authorName}</p>
              <p className="truncate text-xs text-zinc-400">
                {item.storyTitle} · vừa trả lời độc giả
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-cyan-300">Xem</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
