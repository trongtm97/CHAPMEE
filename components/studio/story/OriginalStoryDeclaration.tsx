"use client";

import { StudioPolicyNotice } from "@/components/studio/StudioPolicyNotice";

export function OriginalStoryDeclaration() {
  return (
    <StudioPolicyNotice
      tone="cyan"
      title="Truyện Sáng Tác"
      note="Tác phẩm do bạn tự sáng tác hoặc bạn có đầy đủ quyền khai thác."
      items={[
        "Không đăng tác phẩm đồi trụy hoặc vi phạm pháp luật Việt Nam.",
        "Tác phẩm có tỉ lệ đạo văn trên 20% không được xem là tác phẩm tự sáng tác."
      ]}
    />
  );
}
