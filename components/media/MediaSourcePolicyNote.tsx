import {
  CHAPMee_AUDIO_SOURCE_POLICY_HINT,
  CHAPMee_SOURCE_POLICY_HINT
} from "@/lib/media/chapmee-source";
import type { MediaTabId } from "@/lib/media/media-tabs";

type MediaSourcePolicyNoteProps = {
  tab: MediaTabId;
  /** Public /media must not show creator policy copy. */
  audience?: "public" | "creator";
};

/**
 * YouTube source requirement — creator/admin only, not public readers.
 */
export function MediaSourcePolicyNote({ tab, audience = "public" }: MediaSourcePolicyNoteProps) {
  if (audience !== "creator") {
    return null;
  }

  const hint = tab === "video" ? CHAPMee_SOURCE_POLICY_HINT : CHAPMee_AUDIO_SOURCE_POLICY_HINT;

  return (
    <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
      <span className="font-semibold text-amber-100">Lưu ý cho tác giả:</span> {hint}
    </p>
  );
}
