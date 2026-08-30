import { SeoContentSection } from "@/components/seo/SeoContentSection";
import {
  getSeoContentBlock,
  type GetSeoContentBlockParams
} from "@/lib/seo/seo-content-service";
import { isPrivateSeoPath } from "@/lib/seo/seo-validation";

type SeoContentBlockSlotProps = GetSeoContentBlockParams;

export async function SeoContentBlockSlot(props: SeoContentBlockSlotProps) {
  const routePath = props.routePath?.trim();
  if (routePath && isPrivateSeoPath(routePath)) {
    return null;
  }

  const block = await getSeoContentBlock(props);
  if (!block) {
    return null;
  }

  return <SeoContentSection block={block} />;
}
