"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  trackSponsoredChallengeEntrySubmitted,
  trackSponsoredChallengeJoined
} from "@/lib/campaigns/campaign-tracking";

type SubmitChallengeEntryProps = {
  challengeId: string;
  onSubmitAction: (formData: FormData) => Promise<void>;
  disabled?: boolean;
  sponsoredTracking?: {
    campaignId: string;
    sponsorId: string | null;
  } | null;
};

export function SubmitChallengeEntry({
  challengeId,
  onSubmitAction,
  disabled,
  sponsoredTracking
}: SubmitChallengeEntryProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Tham gia challenge</p>
        <h3 className="mt-2 text-xl font-black text-white">Gửi entry của bạn</h3>
      </div>
      <form
        action={async (formData) => {
          setLoading(true);
          try {
            if (sponsoredTracking) {
              void trackSponsoredChallengeJoined({
                campaignId: sponsoredTracking.campaignId,
                sponsorId: sponsoredTracking.sponsorId,
                challengeId
              });
              void trackSponsoredChallengeEntrySubmitted({
                campaignId: sponsoredTracking.campaignId,
                sponsorId: sponsoredTracking.sponsorId,
                challengeId
              });
            }
            await onSubmitAction(formData);
          } finally {
            setLoading(false);
          }
        }}
        className="space-y-3"
      >
        <input name="challengeId" type="hidden" value={challengeId} />
        <Input label="Tiêu đề entry" name="title" placeholder="Plot twist 500 chữ" />
        <Input label="Mô tả ngắn" name="description" placeholder="Vì sao entry này hợp challenge?" />
        <Input label="Story ID (optional)" name="storyId" placeholder="Chọn truyện có sẵn của bạn" />
        <Input label="Chapter ID (optional)" name="chapterId" placeholder="Nếu entry là một chap cụ thể" />
        <Button disabled={disabled} loading={loading} type="submit" className="w-full">
          {disabled ? "Challenge đã đóng" : "Gửi entry"}
        </Button>
      </form>
    </Card>
  );
}
