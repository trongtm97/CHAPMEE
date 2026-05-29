import Image from "next/image";
import {
  BRAND_ASSET_VERSION,
  BRAND_LOGO_ASPECT_RATIO,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  brandAssetUrl
} from "@/lib/brand/constants";

type ChapMeeLogoProps = {
  /** Chiều cao hiển thị (px). Chiều rộng tự tính theo tỷ lệ wordmark. */
  height?: number;
  className?: string;
  priority?: boolean;
};

export function ChapMeeLogo({
  className = "h-auto w-auto max-w-none",
  height = 32,
  priority = false
}: ChapMeeLogoProps) {
  const width = Math.round(height * BRAND_LOGO_ASPECT_RATIO);
  const src = brandAssetUrl(BRAND_LOGO_PATH);

  return (
    <Image
      alt={BRAND_NAME}
      className={className}
      height={height}
      priority={priority}
      src={src}
      style={{ height, width: "auto", maxHeight: height }}
      unoptimized
      width={width}
    />
  );
}
