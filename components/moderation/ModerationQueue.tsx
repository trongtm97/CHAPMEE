import { Card } from "@/components/ui";
import type { ModerationQueueItem } from "@/types/moderation";

type ModerationQueueProps = {
  items: ModerationQueueItem[];
};

export function ModerationQueue({ items }: ModerationQueueProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card className="space-y-3 p-4" key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">{item.targetType}</p>
              <p className="text-xs text-zinc-400">{item.reasonCode}</p>
            </div>
            <div className="text-right text-xs text-zinc-400">
              <p>{item.reportCount} reports</p>
              <p>{item.moderationStatus ?? "open"}</p>
            </div>
          </div>
          {item.preview ? <p className="text-sm leading-6 text-zinc-300">{item.preview}</p> : null}
        </Card>
      ))}
    </div>
  );
}
