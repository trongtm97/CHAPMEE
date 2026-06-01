import {
  ENTITY_CODE_PREFIX,
  NUMERIC_PUBLIC_CODE_REGEX,
  type PublicEntityType
} from "@/lib/urls/constants";

export type ParsedPublicSegment = {
  slugPart: string;
  publicCode: string;
  entityType: PublicEntityType;
};

function buildSegmentRegex(prefix: string): RegExp {
  return new RegExp(
    `^(.+)-${prefix}\\.([0-9]{8,12})$`
  );
}

const SEGMENT_PATTERNS: Array<{
  entityType: PublicEntityType;
  regex: RegExp;
}> = (Object.entries(ENTITY_CODE_PREFIX) as Array<[PublicEntityType, string]>).map(
  ([entityType, prefix]) => ({
    entityType,
    regex: buildSegmentRegex(prefix)
  })
);

export function parsePublicSegment(
  segment: string,
  entityType: PublicEntityType
): ParsedPublicSegment | null {
  const prefix = ENTITY_CODE_PREFIX[entityType];
  const match = segment.match(buildSegmentRegex(prefix));
  if (!match) {
    return null;
  }

  const publicCode = match[2];
  if (!NUMERIC_PUBLIC_CODE_REGEX.test(publicCode)) {
    return null;
  }

  return {
    slugPart: match[1],
    publicCode,
    entityType
  };
}

export function parsePublicCodeFromPath(
  pathname: string,
  entityType: PublicEntityType
): string | null {
  const normalized = pathname.replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  switch (entityType) {
    case "story": {
      if (segments[0] !== "truyen" || !segments[1]) {
        return null;
      }
      return parsePublicSegment(segments[1], "story")?.publicCode ?? null;
    }
    case "chapter": {
      if (
        segments[0] !== "truyen" ||
        !segments[1] ||
        segments[2] !== "chuong" ||
        !segments[3]
      ) {
        return null;
      }
      return parsePublicSegment(segments[3], "chapter")?.publicCode ?? null;
    }
    case "reel": {
      if (segments[0] !== "reels" || !segments[1]) {
        return null;
      }
      return parsePublicSegment(segments[1], "reel")?.publicCode ?? null;
    }
    case "content_post": {
      if (segments[0] !== "bai-viet" || !segments[1]) {
        return null;
      }
      return parsePublicSegment(segments[1], "content_post")?.publicCode ?? null;
    }
    case "announcement": {
      if (segments[0] !== "thong-bao" || !segments[1]) {
        return null;
      }
      return parsePublicSegment(segments[1], "announcement")?.publicCode ?? null;
    }
    case "policy": {
      if (segments[0] !== "chinh-sach" || !segments[1]) {
        return null;
      }
      return parsePublicSegment(segments[1], "policy")?.publicCode ?? null;
    }
    default:
      return null;
  }
}

export function tryParseAnyPublicSegment(
  segment: string
): ParsedPublicSegment | null {
  for (const { entityType, regex } of SEGMENT_PATTERNS) {
    const match = segment.match(regex);
    if (!match) {
      continue;
    }
    const publicCode = match[2];
    if (!NUMERIC_PUBLIC_CODE_REGEX.test(publicCode)) {
      continue;
    }
    return {
      slugPart: match[1],
      publicCode,
      entityType
    };
  }
  return null;
}
