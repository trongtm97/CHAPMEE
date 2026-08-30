/**
 * Client-safe media URL builder (public base only — no secrets).
 * Set NEXT_PUBLIC_S3_PUBLIC_BASE_URL mirroring server S3_PUBLIC_BASE_URL.
 */

export function getClientPublicMediaBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "") ??
    ""
  );
}

export function resolvePublicMediaUrlClient(stored: string | null | undefined): string | null {
  const value = stored?.trim();
  if (!value) {
    return null;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  const base = getClientPublicMediaBaseUrl();
  if (!base) {
    return null;
  }
  return `${base}/${value.replace(/^\/+/, "")}`;
}
