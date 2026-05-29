"use client";

import { Button, Card } from "@/components/ui";
import type { LocalDraftSnapshot } from "@/lib/studio/local-draft-storage";

type StudioLocalDraftRecoveryProps = {
  onApply: () => void;
  onDismiss: () => void;
  snapshot: LocalDraftSnapshot;
};

export function StudioLocalDraftRecovery({
  onApply,
  onDismiss,
  snapshot
}: StudioLocalDraftRecoveryProps) {
  return (
    <Card className="border-amber-400/30 bg-amber-400/10">
      <p className="text-sm font-semibold text-amber-100">
        Có bản lưu tạm trên thiết bị này. Bạn muốn khôi phục không?
      </p>
      <p className="mt-2 text-xs text-amber-200/80">
        Lưu lúc{" "}
        {new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          month: "2-digit"
        }).format(new Date(snapshot.savedAt))}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onApply} type="button">
          Khôi phục
        </Button>
        <Button onClick={onDismiss} type="button" variant="secondary">
          Bỏ qua
        </Button>
      </div>
    </Card>
  );
}
