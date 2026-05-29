import { Badge, Card } from "@/components/ui";
import { ShareButton } from "@/components/share/ShareButton";
import { buildMilestoneSharePayload } from "@/lib/share/achievementShare";
import { getShareUrl } from "@/lib/share/getShareUrl";
import type { MilestoneViewItem } from "@/types/milestone";

type MilestoneCardProps = {
  milestone: MilestoneViewItem;
};

const toneToBadgeVariant: Record<MilestoneViewItem["tone"], "default" | "success" | "warning" | "danger"> = {
  default: "default",
  success: "success",
  warning: "warning",
  danger: "danger"
};

const typeLabel: Record<MilestoneViewItem["milestoneType"], string> = {
  reader: "Đọc giả",
  author: "Tác giả",
  story: "Theo truyện",
  comment: "Bình luận",
  general: "Chung"
};

function readContextLabel(milestone: MilestoneViewItem) {
  const metadata = milestone.metadata ?? {};
  const storyTitle = typeof metadata.story_title === "string" ? metadata.story_title : null;
  const followerCount =
    typeof metadata.follower_count === "number" ? metadata.follower_count : null;
  const readCount = typeof metadata.read_count === "number" ? metadata.read_count : null;

  if (storyTitle) {
    return storyTitle;
  }

  if (followerCount !== null) {
    return `${followerCount} follower`;
  }

  if (readCount !== null) {
    return `${readCount} lượt đọc`;
  }

  return null;
}

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const context = readContextLabel(milestone);

  return (
    <Card className="space-y-4 border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-xl">
          {milestone.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black tracking-normal text-white">
                {milestone.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                {milestone.description}
              </p>
            </div>
            <Badge variant={toneToBadgeVariant[milestone.tone]}>
              {typeLabel[milestone.milestoneType]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">{milestone.achievedLabel}</Badge>
        {context ? <Badge variant="success">{context}</Badge> : null}
      </div>
      <div className="flex justify-end">
        <ShareButton
          label="Chia sẻ"
          payload={buildMilestoneSharePayload({
            milestone,
            url: getShareUrl(`/me#milestones`)
          })}
        />
      </div>
    </Card>
  );
}

