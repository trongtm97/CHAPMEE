import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";
import { resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";
import type { TaxonomyTerm, TaxonomyTermRow } from "@/types/taxonomy";

export type TaxonomyMediaFields = Pick<
  TaxonomyTermRow,
  "og_image_url" | "og_image_asset_id"
>;

/** Resolve taxonomy OG image — prefers og_image_asset_id. */
export async function resolveTaxonomyOgImageUrl(
  term: TaxonomyMediaFields
): Promise<string | null> {
  if (term.og_image_asset_id) {
    const fromAsset = await resolveMediaAssetPublicUrl(term.og_image_asset_id);
    if (fromAsset) {
      return fromAsset;
    }
  }
  return resolveStoredMediaUrl(term.og_image_url);
}

export async function resolveTaxonomyOgImageForTerm(term: TaxonomyTerm): Promise<string | null> {
  return resolveTaxonomyOgImageUrl(term);
}
