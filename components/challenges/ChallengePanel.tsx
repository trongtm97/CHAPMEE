import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";

type ChallengePanelProps = {
  active: boolean;
};

export function ChallengePanel({ active }: ChallengePanelProps) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">After chapter</p>
        <h3 className="mt-2 text-xl font-black text-white">Chạm vào cộng đồng ngay sau khi đọc xong</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950" href="/community">
          Comment
        </Link>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-black uppercase tracking-[0.12em] text-white" href="/discover">
          Xem truyện khác
        </Link>
      </div>
      {active ? null : (
        <EmptyState title="Challenge chưa mở" description="Khi challenge active, tác giả có thể gửi entry." />
      )}
    </Card>
  );
}
