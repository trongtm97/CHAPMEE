"use client";

import Link from "next/link";
import { Button, EmptyState } from "@/components/ui";

export function MonetizationStoriesEmptyState() {
  return (
    <EmptyState
      action={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/studio/stories/new">
            <Button className="w-full sm:w-auto" type="button">
              Tạo truyện mới
            </Button>
          </Link>
          <Link href="/studio/import">
            <Button className="w-full sm:w-auto" type="button" variant="secondary">
              Nhập hàng loạt
            </Button>
          </Link>
        </div>
      }
      description="Sau khi có truyện, bạn có thể bật trả phí hoặc nhận tip tại đây."
      title="Bạn chưa có truyện để bật kiếm tiền"
    />
  );
}
