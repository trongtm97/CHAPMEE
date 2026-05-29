export type ThankYouRecipientGroupType =
  | "top_fans"
  | "early_fans"
  | "commenters"
  | "all_readers";

export type AuthorThankYouRecord = {
  id: string;
  authorId: string;
  storyId: string | null;
  recipientUserId: string | null;
  recipientGroupType: ThankYouRecipientGroupType | null;
  message: string;
  createdAt: string;
};

export type AuthorThankYouView = AuthorThankYouRecord & {
  authorName: string;
  authorAvatarUrl: string | null;
  storyTitle: string | null;
  recipientLabel: string;
  shareUrl: string;
};

export const THANK_YOU_RECIPIENT_GROUPS: {
  id: ThankYouRecipientGroupType;
  label: string;
  hint: string;
}[] = [
  { id: "top_fans", label: "Top Fan", hint: "Cảm ơn fan nhiệt nhất" },
  { id: "early_fans", label: "Fan đời đầu", hint: "Cảm ơn người đến sớm" },
  { id: "commenters", label: "Người bình luận", hint: "Cảm ơn comment hay" },
  { id: "all_readers", label: "Tất cả độc giả", hint: "Cảm ơn mọi người đã đọc" }
];
