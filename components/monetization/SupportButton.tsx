import { TipGiftSheet } from "@/components/monetization/TipGiftSheet";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { getActiveVirtualGifts } from "@/lib/data/virtual-gifts";
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

  const [config, creatorCanEarn, gifts, currentUser] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    isCreatorMonetizationAllowed(toCreatorUserId),
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

  if (!creatorCanEarn) {
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
