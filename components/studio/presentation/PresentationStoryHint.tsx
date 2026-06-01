import Link from "next/link";
import {
  modeUsesStructuredContent,
  PRESENTATION_MODE_LABELS
} from "@/lib/presentation/constants";
import { studioPath } from "@/lib/studio/constants";
import type { PresentationMode } from "@/types/presentation";

type PresentationStoryHintProps = {
  presentationMode: PresentationMode;
  storyId: string;
};

export function PresentationStoryHint({
  presentationMode,
  storyId
}: PresentationStoryHintProps) {
  if (!modeUsesStructuredContent(presentationMode)) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm text-violet-100">
      Truyện đang dùng định dạng{" "}
      <strong className="font-semibold text-white">
        {PRESENTATION_MODE_LABELS[presentationMode]}
      </strong>
      . Khi soạn chương, dùng tab <strong className="font-semibold text-white">Cấu trúc</strong>{" "}
      hoặc cột <code className="rounded bg-black/30 px-1 text-xs">structured_content_json</code> khi
      nhập hàng loạt.{" "}
      <Link
        className="font-semibold text-violet-200 underline-offset-2 hover:underline"
        href={studioPath(`/stories/${storyId}/edit`)}
      >
        Đổi định dạng truyện
      </Link>
    </div>
  );
}
