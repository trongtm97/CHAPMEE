"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui";
import {
  updateProfilePrivacyAction,
  type UpdateProfilePrivacyState
} from "@/lib/profile/update-profile-privacy";
import type { ProfilePrivacySettings } from "@/types/public-profile";

const initialState: UpdateProfilePrivacyState = { error: null, success: false };

type ProfilePrivacySettingsFormProps = {
  settings: ProfilePrivacySettings;
  profileUrl: string | null;
};

const fields: { key: keyof Omit<ProfilePrivacySettings, "userId" | "updatedAt">; label: string; hint?: string }[] = [
  { key: "showPublicCollections", label: "Hiển thị tủ truyện công khai" },
  { key: "showPublicActivities", label: "Hiển thị hoạt động công khai" },
  { key: "showPublicComments", label: "Hiển thị bình luận/review công khai" },
  { key: "showBadges", label: "Hiển thị thành tích/badge" },
  { key: "showCreatorWorks", label: "Hiển thị tác phẩm tác giả" },
  { key: "showReadingHistory", label: "Hiển thị truyện đang đọc" },
  { key: "showSavedStories", label: "Hiển thị truyện đã lưu" },
  { key: "showFollowedAuthors", label: "Hiển thị tác giả đang theo dõi" },
  { key: "showFollowedGroups", label: "Hiển thị nhóm đang theo dõi" },
  { key: "allowFollow", label: "Cho người khác theo dõi tôi" },
  {
    key: "allowDm",
    label: "Cho phép nhắn tin (tổng quát)",
    hint: "Chi tiết quyền nhắn tin: Cài đặt → Cài đặt tin nhắn."
  }
];

export function ProfilePrivacySettingsForm({
  profileUrl,
  settings
}: ProfilePrivacySettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfilePrivacyAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <Card className="space-y-1 overflow-hidden p-0">
        <div className="border-b border-white/5 px-4 py-3">
          <h2 className="text-sm font-bold text-white">Hồ sơ công khai</h2>
          <p className="mt-1 text-xs text-zinc-500">Ai có thể xem?</p>
          {profileUrl ? (
            <p className="mt-2 text-xs text-cyan-200/90">
              Liên kết:{" "}
              <a className="underline" href={profileUrl}>
                {profileUrl}
              </a>
            </p>
          ) : null}
        </div>
        {fields.map((field) => (
          <label
            className="flex cursor-pointer items-start justify-between gap-3 border-b border-white/5 px-4 py-3 last:border-0"
            key={field.key}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-200">{field.label}</span>
              {field.hint ? (
                <span className="mt-0.5 block text-[0.65rem] text-zinc-600">{field.hint}</span>
              ) : null}
            </span>
            <input
              className="mt-1 size-4 shrink-0 accent-cyan-300"
              defaultChecked={settings[field.key]}
              name={field.key}
              type="checkbox"
            />
          </label>
        ))}
      </Card>

      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-300">Đã lưu cài đặt riêng tư.</p>
      ) : null}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Đang lưu…" : "Lưu cài đặt"}
      </button>
    </form>
  );
}
