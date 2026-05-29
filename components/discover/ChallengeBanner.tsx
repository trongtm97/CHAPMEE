import Link from "next/link";
import { Card } from "@/components/ui";

type ChallengeBannerProps = {
  hasActiveChallenge: boolean;
};

export function ChallengeBanner({ hasActiveChallenge }: ChallengeBannerProps) {
  if (!hasActiveChallenge) {
    return null;
  }

  return (
    <Card className="space-y-3 overflow-hidden bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(236,72,153,0.12))] p-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-100">Challenge đang diễn ra</p>
        <h3 className="mt-2 text-lg font-black text-white">Tìm truyện mới từ các thử thách của cộng đồng.</h3>
      </div>
      <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950/90 px-4 text-sm font-black uppercase tracking-[0.12em] text-white" href="/challenges">
        Khám phá
      </Link>
    </Card>
  );
}
