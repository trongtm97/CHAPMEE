import { Badge, Card } from "@/components/ui";

type EarlyFanBadgeProps = {
  earlyFanCount: number;
  isEarlyFan: boolean;
  storyTitle: string;
};

export function EarlyFanBadge({
  earlyFanCount,
  isEarlyFan,
  storyTitle
}: EarlyFanBadgeProps) {
  return (
    <Card className="space-y-3 border-cyan-300/15 bg-cyan-300/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
            Fan đời đầu
          </p>
          <h2 className="mt-1 text-base font-black tracking-normal text-white">
            Những người phát hiện {storyTitle} từ sớm
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Fan đời đầu là người theo dõi truyện khi nó còn rất mới, trước khi
            trở nên phổ biến.
          </p>
        </div>
        <Badge variant={earlyFanCount > 0 ? "success" : "default"}>
          {earlyFanCount > 0 ? `${earlyFanCount} fan` : "Chưa có"}
        </Badge>
      </div>

      {isEarlyFan ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
          <p className="text-sm font-bold text-cyan-100">
            Bạn là Fan đời đầu của truyện này
          </p>
          <p className="mt-1 text-sm leading-6 text-cyan-50/80">
            Huy hiệu của bạn sẽ được giữ lại ngay cả khi bạn unfollow sau này.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
