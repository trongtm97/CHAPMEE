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

const SURFACE_DIMENSIONS: Record<MediaSurface, { width: number; height: number; sizes: string }> = {
  admin: { width: 160, height: 160, sizes: "160px" },
  avatar: { width: 96, height: 96, sizes: "96px" },
  card: { width: 640, height: 360, sizes: "(max-width: 768px) 100vw, 360px" },
  cover: { width: 800, height: 1200, sizes: "(max-width: 768px) 40vw, 160px" },
  reader: { width: 1200, height: 1600, sizes: "(max-width: 768px) 100vw, 760px" },
  reels: { width: 720, height: 1280, sizes: "100vw" },
  thumbnail: { width: 320, height: 320, sizes: "120px" }
};

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
  const surfaceDimensions = SURFACE_DIMENSIONS[surface];
  const resolvedWidth = width ?? asset?.width ?? surfaceDimensions.width;
  const resolvedHeight = height ?? asset?.height ?? surfaceDimensions.height;
  const resolvedSizes = sizes ?? surfaceDimensions.sizes;
  const resolvedClassName = className ? `object-cover ${className}` : "object-cover";

  if (fill) {
    return (
      <Image
        alt={asset?.alt ?? alt}
        className={resolvedClassName}
        fill
        placeholder="empty"
        priority={priority}
        sizes={resolvedSizes}
        src={src}
      />
    );
  }

  return (
    <Image
      alt={asset?.alt ?? alt}
      className={resolvedClassName}
      height={resolvedHeight}
      loading={priority ? "eager" : "lazy"}
      placeholder="empty"
      priority={priority}
      sizes={resolvedSizes}
      src={src}
      width={resolvedWidth}
    />
  );
}
