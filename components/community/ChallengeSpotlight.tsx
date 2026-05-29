import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";

type ChallengeSpotlightProps = {
  hasActiveChallenge: boolean;
};

export function ChallengeSpotlight({ hasActiveChallenge }: ChallengeSpotlightProps) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Thử thách viết truyện</p>
        <h3 className="mt-2 text-xl font-black text-white">Tham gia challenge, vote bài viết và khám phá tác giả mới.</h3>
      </div>
      {hasActiveChallenge ? (
        <div className="space-y-2 rounded-3xl border border-cyan-300/15 bg-cyan-300/8 p-4">
          <p className="text-sm font-bold text-zinc-100">Challenge đang diễn ra</p>
          <p className="text-sm leading-6 text-zinc-300">Thử thách giúp tạo động lực sáng tác và nội dung cộng đồng mới mẻ.</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950" href="/challenges">
            Xem thử thách
          </Link>
        </div>
      ) : (
        <EmptyState description="Chưa có thử thách đang diễn ra." title="Chưa có thử thách" />
      )}
    </Card>
  );
}
