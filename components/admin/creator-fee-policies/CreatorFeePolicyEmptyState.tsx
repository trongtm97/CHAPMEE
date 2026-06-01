"use client";

import { Button } from "@/components/ui";
import type { CreatorFeePolicyAdminCapabilities } from "@/types/admin-creator-fee-policy";

type Props = {
  capabilities: CreatorFeePolicyAdminCapabilities;
  onCreate: () => void;
};

export function CreatorFeePolicyEmptyState({ capabilities, onCreate }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">Chưa có chính sách phí riêng.</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
        Mặc định, tất cả tác giả đang dùng tỷ lệ trong Cấu hình kiếm tiền. Hãy tạo policy riêng cho
        tác giả chiến lược, Originals hoặc đối tác đặc biệt.
      </p>
      {capabilities.canCreate ? (
        <Button className="mt-6" onClick={onCreate} type="button">
          + Tạo policy mới
        </Button>
      ) : null}
    </div>
  );
}
