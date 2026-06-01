import type { BrandCampaignRecord } from "@/types/campaign";

type StoryTarget = {
  id: string;
  slug?: string | null;
};

type ChapterTarget = {
  id: string;
};

export function campaignMatchesStoryTarget(
  campaign: Pick<BrandCampaignRecord, "targetType" | "targetId">,
  story: StoryTarget
) {
  const targetType = campaign.targetType ?? "none";
  const targetId = campaign.targetId?.trim() ?? "";

  if (!targetType || targetType === "none") {
    return true;
  }

  if (targetType === "story") {
    if (!targetId) return false;
    return targetId === story.id || (story.slug ? targetId === story.slug : false);
  }

  return false;
}

export function campaignMatchesChapterTarget(
  campaign: Pick<BrandCampaignRecord, "targetType" | "targetId">,
  story: StoryTarget,
  chapter: ChapterTarget
) {
  const targetType = campaign.targetType ?? "none";
  const targetId = campaign.targetId?.trim() ?? "";

  if (!targetType || targetType === "none") {
    return true;
  }

  if (targetType === "chapter") {
    return Boolean(targetId) && targetId === chapter.id;
  }

  if (targetType === "story") {
    return campaignMatchesStoryTarget(campaign, story);
  }

  return false;
}

export function campaignMatchesCreatorStudio(
  campaign: Pick<BrandCampaignRecord, "targetType" | "targetId">
) {
  const targetType = campaign.targetType ?? "none";
  if (!targetType || targetType === "none" || targetType === "creator_studio") {
    return true;
  }
  return false;
}
