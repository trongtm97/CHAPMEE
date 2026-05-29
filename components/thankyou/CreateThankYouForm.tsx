"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { THANK_YOU_RECIPIENT_GROUPS } from "@/types/thank-you";

type CreateThankYouFormProps = {
  authorId: string;
  onSubmitAction: (formData: FormData) => Promise<void>;
  audienceHints?: {
    hasTopFans?: boolean;
    hasEarlyFans?: boolean;
  };
};

export function CreateThankYouForm({ authorId, onSubmitAction, audienceHints }: CreateThankYouFormProps) {
  const [loading, setLoading] = useState(false);
  const allowedGroups = THANK_YOU_RECIPIENT_GROUPS.filter((group) => {
    if (group.id === "top_fans") return audienceHints?.hasTopFans !== false;
    if (group.id === "early_fans") return audienceHints?.hasEarlyFans !== false;
    return true;
  });

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Cảm ơn độc giả</p>
        <h3 className="mt-2 text-xl font-black text-white">Gửi lời cảm ơn nhỏ, tạo hiệu ứng lớn</h3>
      </div>
      <form
        action={async (formData) => {
          setLoading(true);
          try {
            await onSubmitAction(formData);
          } finally {
            setLoading(false);
          }
        }}
        className="space-y-3"
      >
        <input name="authorId" type="hidden" value={authorId} />
        <Input label="Story ID" name="storyId" placeholder="Chọn truyện liên quan" />
        <label className="space-y-2">
          <span className="text-sm font-semibold text-zinc-200">Đối tượng nhận</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
            name="recipientGroupType"
            defaultValue="top_fans"
          >
            {allowedGroups.map((group) => (
              <option className="bg-zinc-900" key={group.id} value={group.id}>
                {group.label} — {group.hint}
              </option>
            ))}
          </select>
        </label>
        <Input label="Tin nhắn" name="message" placeholder="Cảm ơn mọi người đã ủng hộ truyện của mình!" />
        <Button className="w-full" loading={loading} type="submit">
          Gửi lời cảm ơn
        </Button>
      </form>
    </Card>
  );
}
