import type {
  AnalyticsMetadata,
  AnalyticsMetadataValue
} from "@/types/analytics";

const sensitiveKeyParts = [
  "bio",
  "content",
  "details",
  "email",
  "name",
  "password",
  "phone",
  "reason",
  "token"
];

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase();

  return sensitiveKeyParts.some((part) => normalizedKey.includes(part));
}

function sanitizeValue(value: AnalyticsMetadataValue): AnalyticsMetadataValue {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return sanitizeAnalyticsMetadata(value as AnalyticsMetadata);
  }

  if (typeof value === "string") {
    return value.slice(0, 200);
  }

  return value;
}

export function sanitizeAnalyticsMetadata(
  metadata: AnalyticsMetadata
): AnalyticsMetadata {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, value]) => [key, sanitizeValue(value)])
  );
}
