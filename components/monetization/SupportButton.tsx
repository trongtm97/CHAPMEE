import { TipGiftSheet } from "@/components/monetization/TipGiftSheet";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import { getActiveVirtualGifts } from "@/lib/supabase/virtual-gifts";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type SupportButtonProps = {
  toCreatorUserId: string | null;
  storyId?: string | null;
  chapterId?: string | null;
};

export async function SupportButton({
  toCreatorUserId,
  storyId,
  chapterId
}: SupportButtonProps) {
  if (!toCreatorUserId) return null;

  const [config, profile, gifts, currentUser] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    getCreatorMonetizationProfile(toCreatorUserId),
    getActiveVirtualGifts(),
    getCurrentUser()
  ]);

  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    (Boolean(config.settings["tips.enabled"]) ||
      Boolean(config.settings["virtual_gifts.enabled"]));
  if (!enabled) return null;

  if (!profile.data || profile.data.status !== "approved" || !profile.data.monetization_enabled) {
    return null;
  }

  if (!currentUser.user || currentUser.user.id === toCreatorUserId) {
    return null;
  }

  return (
    <TipGiftSheet
      chapterId={chapterId}
      gifts={gifts.data}
      purchaseEnabled={Boolean(config.settings["coin.purchase_enabled"])}
      storyId={storyId}
      toCreatorUserId={toCreatorUserId}
    />
  );
}
