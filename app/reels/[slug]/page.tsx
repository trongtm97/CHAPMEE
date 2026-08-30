import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/data/server";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { getReelUrl } from "@/lib/seo/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";

type ReelRouteProps = {
  params: Promise<{ slug: string }>;
};

async function resolveReel(segment: string) {
  const parsed = parsePublicSegment(segment, "reel");
  const db = await createClient();

  if (parsed) {
    const { data } = await db
      .from("reels_items")
      .select("id, slug, public_code, status")
      .eq("public_code", parsed.publicCode)
      .eq("status", "published")
      .maybeSingle();

    if (!data?.public_code) {
      return null;
    }

    return {
      publicCode: data.public_code,
      canonicalPath: getReelUrl({ slug: data.slug, public_code: data.public_code })
    };
  }

  const { data } = await db
    .from("reels_items")
    .select("id, slug, public_code, status")
    .eq("slug", segment)
    .eq("status", "published")
    .maybeSingle();

  if (!data?.public_code) {
    return null;
  }

  return {
    publicCode: data.public_code,
    canonicalPath: getReelUrl({ slug: data.slug, public_code: data.public_code })
  };
}

export default async function ReelCanonicalRoute({ params }: ReelRouteProps) {
  const { slug: segment } = await params;
  const currentPath = `/reels/${segment}`;

  await tryRedirectFromLookupTable(currentPath);

  const resolved = await resolveReel(segment);
  if (!resolved) {
    notFound();
  }

  redirectToCanonicalIfNeeded({
    currentPath,
    canonicalPath: resolved.canonicalPath
  });

  redirect(`/reels?reel=${encodeURIComponent(resolved.publicCode)}`);
}
