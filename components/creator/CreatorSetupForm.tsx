"use client";

import { useActionState } from "react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import {
  createCreatorProfileAction,
  type CreatorSetupState
} from "@/lib/creator/createCreatorProfile";
import { STUDIO_FULL_NAME } from "@/lib/studio/constants";

const initialState: CreatorSetupState = {
  error: null,
  success: false
};

export function CreatorSetupForm() {
  const [state, formAction, pending] = useActionState(
    createCreatorProfileAction,
    initialState
  );

  return (
    <Card>
      <form action={formAction} className="space-y-5">
        <Input
          autoComplete="nickname"
          disabled={pending}
          label="Bút danh"
          maxLength={80}
          name="pen_name"
          placeholder="VD: Mây Kể Chuyện"
          required
        />
        <Textarea
          disabled={pending}
          label="Giới thiệu"
          maxLength={500}
          name="bio"
          placeholder="Giới thiệu ngắn về phong cách viết của bạn."
          rows={5}
        />
        {state.error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            Hồ sơ tác giả đã sẵn sàng. Đang chuyển đến {STUDIO_FULL_NAME}...
          </p>
        ) : null}
        <Button className="w-full" loading={pending} type="submit">
          Tạo hồ sơ tác giả
        </Button>
      </form>
    </Card>
  );
}
