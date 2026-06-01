import type { TrackingMetadata } from "@/types/tracking";

const sensitiveKeyParts = [
  "bio",
  "content",
  "details",
  "detail",
  "email",
  "name",
  "password",
  "phone",
  "reason",
  "token",
  "message",
  "bank",
  "pin"
];

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase();
  return sensitiveKeyParts.some((part) => normalizedKey.includes(part));
}

function sanitizeValue(
  value: TrackingMetadata[string]
): TrackingMetadata[string] {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === "string" ? entry.slice(0, 64) : entry
    ) as TrackingMetadata[string];
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return sanitizeTrackingMetadata(value as TrackingMetadata) as unknown as TrackingMetadata[string];
  }

  if (typeof value === "string") {
    return value.slice(0, 200);
  }

  return value;
}

export function sanitizeTrackingMetadata(
  metadata: TrackingMetadata
): TrackingMetadata {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, value]) => [key, sanitizeValue(value)])
  );
}

/** Report/hide reason codes only (not free-text). */
export function sanitizeReasonCode(reason: string | null | undefined) {
  if (!reason) {
    return null;
  }
  const normalized = reason.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return normalized.slice(0, 64) || null;
}
