import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { AuthorThankYouView } from "@/types/thank-you";

type AuthorThankYouCardProps = {
  thankYou: AuthorThankYouView;
};

export function AuthorThankYouCard({ thankYou }: AuthorThankYouCardProps) {
  return (
    <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(255,255,255,0.03))] p-0">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Lời cảm ơn từ tác giả</p>
            <h3 className="mt-2 text-xl font-black text-white">{thankYou.authorName}</h3>
            <p className="mt-1 text-xs text-zinc-400">{thankYou.storyTitle ?? "ChapMee"}</p>
          </div>
          <Badge variant="success">ChapMee</Badge>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.2)]">
          <p className="text-sm leading-7 text-zinc-100">{thankYou.message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span>{thankYou.recipientLabel}</span>
          <span>•</span>
          <span>{new Date(thankYou.createdAt).toLocaleDateString("vi-VN")}</span>
          <span>•</span>
          <span>#{thankYou.id.slice(0, 6)}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm font-bold text-cyan-200 underline-offset-2 hover:underline" href={thankYou.shareUrl}>
            Mở chi tiết
          </Link>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">ChapMee</span>
        </div>
      </div>
    </Card>
  );
}
