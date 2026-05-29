import { ShareProfileCard } from "@/components/share/ShareProfileCard";
import type { ShareCardPayload } from "@/types/share";

export function ShareAchievementCard({ payload }: { payload: ShareCardPayload }) {
  return <ShareProfileCard payload={payload} />;
}
