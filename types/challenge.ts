export type ChallengeStatus = "draft" | "active" | "closed";

export type ChallengeRecord = {
  id: string;
  title: string;
  description: string | null;
  promptText: string;
  status: ChallengeStatus;
  startsAt: string | null;
  endsAt: string | null;
  sponsoredCampaignId: string | null;
  createdAt: string;
};

export type ChallengeEntryRecord = {
  id: string;
  challengeId: string;
  userId: string;
  storyId: string | null;
  chapterId: string | null;
  title: string;
  description: string | null;
  createdAt: string;
  voteCount: number;
  userVoted: boolean;
};

export type ChallengeView = ChallengeRecord & {
  entryCount: number;
  userCanJoin: boolean;
};

export type ChallengeEntryView = ChallengeEntryRecord & {
  authorName: string | null;
  storyTitle: string | null;
  storySlug: string | null;
  storyPublicCode: string | null;
};

export type ChallengeFormValues = {
  title: string;
  description: string | null;
  promptText: string;
  status: ChallengeStatus;
  startsAt: string | null;
  endsAt: string | null;
};
