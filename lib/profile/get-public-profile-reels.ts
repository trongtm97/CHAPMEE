import { createClient } from "@/lib/data/server";
import { resolveReelsBackgroundUrl } from "@/lib/reels/resolve-reels-background";
import { getReelUrl } from "@/lib/urls/paths";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type { PublicReelItem } from "@/types/public-profile";

const PAGE_SIZE = 12;

type ReelRow = {
  id: string;
  hook: string;
  title: string | null;
  slug: string | null;
  public_code: string | null;
  background_image_url: string | null;
  view_count: number | null;
  published_at: string | null;
};

export async function getPublicReelsForUser(
  userId: string,
  page = 1,
  options?: { allowed?: boolean }
): Promise<{ items: PublicReelItem[]; total: number }> {
  if (options?.allowed === false) {
    return { items: [], total: 0 };
  }

  const db = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { count } = await db
    .from("reels_items")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "published");

  const { data, error } = await db
    .from("reels_items")
    .select(
      "id, hook, title, slug, public_code, background_image_url, view_count, published_at"
    )
    .eq("owner_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: count ?? 0 };
  }

  const items: PublicReelItem[] = (data as ReelRow[]).map((row) => ({
    id: row.id,
    title: row.title ?? row.hook,
    excerpt: createExcerpt(row.hook, 80),
    coverUrl: resolveReelsBackgroundUrl(row.background_image_url),
    viewCount: Number(row.view_count ?? 0),
    publishedAt: row.published_at,
    href:
      row.slug && row.public_code
        ? getReelUrl({ slug: row.slug, public_code: row.public_code })
        : `/reels`
  }));

  return { items, total: count ?? items.length };
}
