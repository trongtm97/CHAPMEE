import "server-only";

import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getStoryUrl } from "@/lib/urls/paths";
import { NUMERIC_PUBLIC_CODE_REGEX } from "@/lib/urls/constants";
import type { DatabaseClient } from "@/lib/db/types";

type StoryUrlRow = {
  id: string;
  slug: string;
  public_code: string | null;
  canonical_url: string | null;
};

function isPrivateAppPath(path: string | null | undefined): boolean {
  const value = path?.trim();
  if (!value) {
    return false;
  }
  const norm = value.startsWith("/") ? value : `/${value}`;
  return (
    norm.startsWith("/studio") ||
    norm.startsWith("/admin") ||
    norm.startsWith("/creator") ||
    norm.startsWith("/me")
  );
}

/** Ensure story has numeric public_code and a public canonical URL (never /studio/...). */
export async function ensureStoryPublicUrl(
  db: DatabaseClient,
  storyId: string
): Promise<{ slug: string; public_code: string; canonical_url: string } | null> {
  const { data, error } = await db
    .from("stories")
    .select("id, slug, public_code, canonical_url")
    .eq("id", storyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as StoryUrlRow;
  let publicCode = row.public_code?.trim() ?? "";
  if (!publicCode || !NUMERIC_PUBLIC_CODE_REGEX.test(publicCode)) {
    publicCode = await generateNumericPublicCode(db, "story");
  }

  const canonicalPath = getStoryUrl({
    slug: row.slug,
    public_code: publicCode
  });

  const needsUpdate =
    row.public_code !== publicCode ||
    !row.canonical_url?.trim() ||
    isPrivateAppPath(row.canonical_url) ||
    row.canonical_url.trim() !== canonicalPath;

  if (needsUpdate) {
    await db
      .from("stories")
      .update({
        public_code: publicCode,
        canonical_url: canonicalPath
      })
      .eq("id", storyId);
  }

  return {
    slug: row.slug,
    public_code: publicCode,
    canonical_url: canonicalPath
  };
}
