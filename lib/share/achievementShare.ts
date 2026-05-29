import type { MilestoneViewItem } from "@/types/milestone";
import type { ShareCardPayload } from "@/types/share";

export function buildMilestoneSharePayload(input: {
  milestone: MilestoneViewItem;
  url: string;
}): ShareCardPayload {
  return {
    kind: "achievement",
    title: input.milestone.title,
    text: input.milestone.description,
    url: input.url,
    ctaLabel: "Xem milestone trên ChapMee",
    stats: [
      { label: "Loại", value: input.milestone.milestoneType },
      { label: "Đạt lúc", value: input.milestone.achievedLabel }
    ]
  };
}
