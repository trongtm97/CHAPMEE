import { permanentRedirect } from "next/navigation";
import { getProfileUrl } from "@/lib/profile/profile-url";

type LegacyAuthorRouteProps = {
  params: Promise<{ username: string }>;
};

/** Legacy `/tac-gia/:username` → `/@username` */
export default async function LegacyTacGiaUsernameRoute({
  params
}: LegacyAuthorRouteProps) {
  const { username } = await params;
  const target = getProfileUrl(username);
  if (target) {
    permanentRedirect(target);
  }
  permanentRedirect("/discover");
}
