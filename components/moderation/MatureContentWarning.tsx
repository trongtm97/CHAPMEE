"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

type MatureContentWarningProps = {
  storyTitle: string;
  ageRating?: string;
  sensitiveFlags: string[];
  children: React.ReactNode;
};

export function MatureContentWarning({
  ageRating = "all_ages",
  children,
  sensitiveFlags,
  storyTitle
}: MatureContentWarningProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (ageRating !== "mature_18" || confirmed) {
    return <>{children}</>;
  }

  return (
    <Card className="mx-auto max-w-lg space-y-4 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
        Nội dung 18+
      </p>
      <h2 className="text-lg font-bold text-white">{storyTitle}</h2>
      <p className="text-sm leading-7 text-zinc-400">
        Truyện này được gắn nhãn dành cho người từ 18 tuổi trở lên. Một số nội
        dung có thể không phù hợp với lứa tuổi nhỏ hơn.
      </p>
      {sensitiveFlags.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Cảnh báo: {sensitiveFlags.join(", ")}
        </p>
      ) : null}
      <p className="text-xs text-zinc-600">
        {/* TODO: age gate theo ngày sinh hồ sơ khi có trường date_of_birth */}
        ChapMee sẽ bổ sung xác minh tuổi theo hồ sơ trong bản cập nhật sau.
      </p>
      <Button className="w-full" onClick={() => setConfirmed(true)} type="button">
        Tôi đủ 18 tuổi — tiếp tục đọc
      </Button>
    </Card>
  );
}
