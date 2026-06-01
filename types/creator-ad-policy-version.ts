import type { CreatorAdPolicyPublishStatus } from "@/types/creator-ad-revenue-policy";

export type CreatorAdPolicyVersion = {
  id: string;
  version: string;
  status: CreatorAdPolicyPublishStatus;
  title: string;
  body_markdown: string;
  effective_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
