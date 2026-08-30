import { createClient } from "@/lib/data/server";
import { createAdminClient } from "@/lib/data/admin";
import { loadStoryAlgorithmAudit } from "@/lib/explainability/load-item-audit";
import type { CreatorAlgorithmInsight } from "@/types/algorithm-explanation";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export async function getCreatorStoryAlgorithmInsights(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<CreatorAlgorithmInsight | null> {
  const db = await createClient();

  const { data: story } = await db
    .from("stories")
    .select("id, title, creator_id")
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  if (!story) return null;

  const admin = createAdminClient();
  const audit = await loadStoryAlgorithmAudit(admin, storyId);

  if (audit.error) {
    return {
      storyId,
      messages: [
        {
          explanationType: "quality",
          visibility: "creator",
          title: "Chưa có đủ dữ liệu thuật toán",
          message:
            "Hệ thống đang thu thập tín hiệu hiển thị. Tiếp tục xuất bản và cập nhật nội dung để nhận gợi ý chi tiết hơn.",
          severity: "info"
        }
      ]
    };
  }

  return {
    storyId,
    messages: audit.creatorExplanations
  };
}

export async function getCreatorContentHealthInsights(
  creatorProfile: CreatorProfile,
  storyIds: string[]
): Promise<Map<string, CreatorAlgorithmInsight>> {
  const map = new Map<string, CreatorAlgorithmInsight>();
  const limited = storyIds.slice(0, 12);

  await Promise.all(
    limited.map(async (storyId) => {
      const insight = await getCreatorStoryAlgorithmInsights(creatorProfile, storyId);
      if (insight) map.set(storyId, insight);
    })
  );

  return map;
}
