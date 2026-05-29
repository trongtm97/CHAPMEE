"use client";

import { useActionState, useState } from "react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { CreatorProfilePreview } from "@/components/studio/settings/CreatorProfilePreview";
import type { CreatorProfileSettingsActionState } from "@/lib/studio/updateCreatorProfile";
import { updateCreatorProfileAction } from "@/lib/studio/updateCreatorProfile";

type CreatorProfileSettingsFormProps = {
  avatarUrl: string | null;
  bio: string | null;
  creatorId: string;
  creatorPenName: string;
};

const initialState: CreatorProfileSettingsActionState = {
  error: null,
  success: false
};

export function CreatorProfileSettingsForm({
  avatarUrl,
  bio,
  creatorId,
  creatorPenName
}: CreatorProfileSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCreatorProfileAction,
    initialState
  );
  const [penName, setPenName] = useState(creatorPenName);
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [avatarValue, setAvatarValue] = useState(avatarUrl ?? "");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
      <Card>
        <form action={formAction} className="space-y-6">
          <div className="space-y-4">
            <Input
              autoComplete="nickname"
              disabled={pending}
              label="Bút danh"
              maxLength={80}
              name="pen_name"
              onChange={(event) => setPenName(event.target.value)}
              placeholder="VD: Mây Kể Chuyện"
              required
              value={penName}
            />

            <Textarea
              disabled={pending}
              label="Bio"
              maxLength={500}
              name="bio"
              onChange={(event) => setBioValue(event.target.value)}
              placeholder="Giới thiệu ngắn về phong cách viết của bạn."
              rows={6}
              value={bioValue}
            />

            <Input
              disabled={pending}
              label="Avatar URL"
              name="avatar_url"
              onChange={(event) => setAvatarValue(event.target.value)}
              placeholder="https://..."
              value={avatarValue}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-400">
            <p className="font-semibold text-white">Public profile info</p>
            <p className="mt-2">
              These fields shape your public creator page. Keep the bio short
              and memorable so readers can understand your voice quickly.
            </p>
          </div>

          {state.error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              Đã lưu hồ sơ creator.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="sm:min-w-40"
              loading={pending}
              type="submit"
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <CreatorProfilePreview
          avatarUrl={avatarValue.trim() ? avatarValue : null}
          bio={bioValue.trim() ? bioValue : null}
          creatorId={creatorId}
          penName={penName.trim() ? penName : creatorPenName}
        />
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-white">Guidance</p>
          <ul className="space-y-2 text-sm leading-6 text-zinc-400">
            <li>Pen name should be easy to remember and consistent everywhere.</li>
            <li>Bio should be short, sharp, and reader-friendly.</li>
            <li>Avatar works best when it is clear at small sizes.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
