import type { ContentQualityStatus } from "@/types/content-quality";

export const PERMANENTLY_HIDDEN_QUALITY_STATUS: ContentQualityStatus =
  "permanently_hidden_low_quality";

export function isStoryPublicByQuality(
  qualityStatus: string | null | undefined
): boolean {
  return qualityStatus !== PERMANENTLY_HIDDEN_QUALITY_STATUS;
}

export function isStoryMonetizationAllowedByQuality(input: {
  qualityStatus: string | null | undefined;
  monetizationDisabledByQuality?: boolean | null;
}) {
  if (input.monetizationDisabledByQuality) {
    return false;
  }

  return isStoryPublicByQuality(input.qualityStatus);
}
