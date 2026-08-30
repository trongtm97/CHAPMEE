import { resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";
import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";

export type AnnouncementMediaFields = {
  og_image_media_asset_id?: string | null;
  og_image_url?: string | null;
};

/** Resolve OG image for announcements — prefers og_image_media_asset_id. */
export async function resolveAnnouncementOgImageUrl(
  item: AnnouncementMediaFields
): Promise<string | null> {
  if (item.og_image_media_asset_id) {
    const fromAsset = await resolveMediaAssetPublicUrl(item.og_image_media_asset_id);
    if (fromAsset) {
      return fromAsset;
    }
  }
  return resolveStoredMediaUrl(item.og_image_url);
}
