import Link from "next/link";
import { AvatarFallback, Badge, Card } from "@/components/ui";
import type { TopFanHighlight, TopFanPerson } from "@/types/fan";

type TopFanBadgeProps = {
  item: TopFanPerson | TopFanHighlight;
};

function isPersonItem(item: TopFanPerson | TopFanHighlight): item is TopFanPerson {
  return "displayName" in item;
}

export function TopFanBadge({ item }: TopFanBadgeProps) {
  const content = (
    <Card className="group overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.85),rgba(15,23,42,0.94))] p-0 transition hover:border-cyan-300/20 hover:bg-[linear-gradient(135deg,rgba(8,47,73,0.95),rgba(15,23,42,1))]">
      <div className="flex items-stretch gap-3 p-4">
        <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-[1.15rem] border border-white/10 bg-white/5 text-center">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-cyan-200">
            #{item.rank}
          </span>
          <span className="mt-1 text-lg font-black leading-none text-white">
            {item.score}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
          <AvatarFallback
            className="ring-1 ring-white/10"
            name={isPersonItem(item) ? item.displayName : item.title}
            size="md"
            src={isPersonItem(item) ? item.avatarUrl : null}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black tracking-normal text-white">
                  {isPersonItem(item) ? item.displayName : item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">
                  {isPersonItem(item)
                    ? item.handle ?? "Top Fan của ChapMee"
                    : item.subtitle ?? "Danh hiệu dành cho fan cứng."}
                </p>
              </div>
              <Badge variant={isPersonItem(item) && item.isCurrentUser ? "success" : "default"}>
                {isPersonItem(item) && item.isCurrentUser ? "Bạn" : "Fan"}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="default">
                {isPersonItem(item) ? "Story / Author fan score" : "Danh hiệu"}
              </Badge>
              <Badge variant="success">{item.score} điểm</Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (isPersonItem(item) || !item.href) {
    return content;
  }

  return (
    <Link className="block" href={item.href}>
      {content}
    </Link>
  );
}
