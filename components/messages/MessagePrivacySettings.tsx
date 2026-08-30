"use client";

import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import { updateMessagePrivacyAction } from "@/lib/actions/messages";
import {
  messageActionEmptyState,
  type MessageActionState
} from "@/lib/actions/message-action-state";
import type { MessagePrivacySettings } from "@/types/messages";

const whoOptions = [
  { value: "everyone", label: "Mọi người" },
  { value: "followers_only", label: "Người theo dõi tôi" },
  { value: "mutual_follow_only", label: "Theo dõi lẫn nhau" },
  { value: "no_one", label: "Không ai" }
] as const;

type MessagePrivacySettingsFormProps = {
  settings: MessagePrivacySettings;
};

export function MessagePrivacySettingsForm({ settings }: MessagePrivacySettingsFormProps) {
  const [state, formAction, pending] = useActionState<MessageActionState, FormData>(
    updateMessagePrivacyAction,
    messageActionEmptyState
  );

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-base font-bold text-white">Tin nhắn</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Kiểm soát ai có thể nhắn tin và yêu cầu tin nhắn với bạn. Cờ &quot;Cho phép
          nhắn tin&quot; trên hồ sơ công khai được đồng bộ khi bạn lưu tại đây.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-zinc-200">
            Ai có thể nhắn tin cho tôi?
          </legend>
          {whoOptions.map((opt) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
              key={opt.value}
            >
              <input
                defaultChecked={settings.whoCanMessage === opt.value}
                name="whoCanMessage"
                type="radio"
                value={opt.value}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>

        <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
          <span>Cho phép yêu cầu tin nhắn từ người lạ</span>
          <input
            defaultChecked={settings.allowMessageRequests}
            name="allowMessageRequests"
            type="checkbox"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
          <span>Lọc tin nhắn nhạy cảm</span>
          <input
            defaultChecked={settings.filterSensitiveMessages}
            name="filterSensitiveMessages"
            type="checkbox"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
          <span>Chặn link từ người lạ</span>
          <input
            defaultChecked={settings.blockLinksFromStrangers}
            name="blockLinksFromStrangers"
            type="checkbox"
          />
        </label>

        {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
        {state.ok ? (
          <p className="text-xs text-cyan-300">Đã lưu cài đặt.</p>
        ) : null}

        <Button loading={pending} type="submit">
          Lưu
        </Button>
      </form>
    </Card>
  );
}
