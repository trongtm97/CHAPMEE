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

type CreatorSetupFormProps = {
  defaultDisplayName?: string | null;
};

export function CreatorSetupForm({ defaultDisplayName }: CreatorSetupFormProps) {
  const [state, formAction, pending] = useActionState(
    createCreatorProfileAction,
    initialState
  );

  return (
    <Card>
      <form action={formAction} className="space-y-5">
        <p className="text-sm text-zinc-400">
          Bật quyền viết truyện trên cùng tài khoản ChapMee của bạn. Không cần tạo hồ sơ
          riêng — một tài khoản, một tên hiển thị và một giới thiệu.
        </p>
        <p className="text-xs text-zinc-500">
          Username công khai dạng <span className="font-mono text-zinc-400">@ten</span> sẽ được
          tạo tự động khi bạn chưa có. Bạn có thể đổi sau trong cài đặt hồ sơ.
        </p>
        <Input
          autoComplete="nickname"
          defaultValue={defaultDisplayName ?? ""}
          disabled={pending}
          label="Tên hiển thị"
          maxLength={80}
          name="display_name"
          placeholder="VD: Mây Kể Chuyện"
          required={!defaultDisplayName}
        />
        <Textarea
          disabled={pending}
          label="Giới thiệu (tuỳ chọn)"
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
            Đã bật quyền viết truyện. Đang chuyển đến {STUDIO_FULL_NAME}...
          </p>
        ) : null}
        <Button className="w-full" loading={pending} type="submit">
          Bật quyền viết truyện
        </Button>
      </form>
    </Card>
  );
}
