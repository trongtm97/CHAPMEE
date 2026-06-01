import Image from "next/image";
import { pickMediaVariantUrl, type MediaSurface, type MediaVariantMap } from "@/lib/media/media-variants";

export type ChapMeeImageAsset = {
  publicUrl?: string | null;
  variants?: MediaVariantMap | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
};

type ChapMeeImageProps = {
  asset?: ChapMeeImageAsset | null;
  alt: string;
  className?: string;
  fallbackUrl?: string;
  fill?: boolean;
  height?: number;
  priority?: boolean;
  sizes?: string;
  surface: MediaSurface;
  url?: string | null;
  width?: number;
};

const DEFAULT_FALLBACK = "/icon.png";

export function ChapMeeImage({
  asset,
  alt,
  className,
  fallbackUrl = DEFAULT_FALLBACK,
  fill,
  height,
  priority = false,
  sizes,
  surface,
  url,
  width
}: ChapMeeImageProps) {
  const src =
    pickMediaVariantUrl(asset?.variants, surface, asset?.publicUrl ?? url) ?? fallbackUrl;
  const resolvedWidth = width ?? asset?.width ?? 640;
  const resolvedHeight = height ?? asset?.height ?? 960;

  if (fill) {
    return (
      <Image
        alt={asset?.alt ?? alt}
        className={className}
        fill
        placeholder="empty"
        priority={priority}
        sizes={sizes ?? "100vw"}
        src={src}
      />
    );
  }

  return (
    <Image
      alt={asset?.alt ?? alt}
      className={className}
      height={resolvedHeight}
      loading={priority ? "eager" : "lazy"}
      placeholder="empty"
      priority={priority}
      sizes={sizes}
      src={src}
      width={resolvedWidth}
    />
  );
}
