export type PollStatus = "active" | "closed";

export type PollOptionRecord = {
  id: string;
  pollId: string;
  optionText: string;
  sortOrder: number;
  createdAt: string;
};

export type PollRecord = {
  id: string;
  storyId: string;
  chapterId: string | null;
  authorId: string;
  question: string;
  status: PollStatus;
  closesAt: string | null;
  createdAt: string;
  options: PollOptionRecord[];
};

export type PollOptionView = PollOptionRecord & {
  voteCount: number;
  percent: number;
  isSelected: boolean;
};

export type PollView = Omit<PollRecord, "options"> & {
  totalVotes: number;
  userVoteOptionId: string | null;
  hasVoted: boolean;
  options: PollOptionView[];
  canVote: boolean;
};

export type PollFormValues = {
  question: string;
  status: PollStatus;
  optionTexts: string[];
};
