import { getTaxonomySitemapPaths } from "@/lib/discovery/sitemap-taxonomy";
import { createClient } from "@/lib/data/server";
import type { SitemapSegmentId } from "@/lib/seo/sitemap-segments";
import type { SeoSitemapSettings } from "@/lib/seo/sitemap-service";

export async function countSitemapSegmentUrls(
  segmentId: SitemapSegmentId,
  _settings?: SeoSitemapSettings
): Promise<number> {
  const db = await createClient();

  switch (segmentId) {
    case "static":
      return 18;
    case "media":
      return 3;
    case "stories": {
      const { count } = await db
        .from("stories")
        .select("*", { count: "exact", head: true })
        .eq("visibility", "public")
        .in("status", ["published", "approved"])
        .not("public_code", "is", null);
      return count ?? 0;
    }
    case "chapters": {
      const { count } = await db
        .from("episodes")
        .select("id, stories!inner(visibility, status, structure_type)", {
          count: "exact",
          head: true
        })
        .in("status", ["published", "approved"])
        .eq("stories.visibility", "public")
        .in("stories.status", ["published", "approved"])
        .not("public_code", "is", null)
        .neq("stories.structure_type", "standalone");
      return count ?? 0;
    }
    case "taxonomy": {
      const paths = await getTaxonomySitemapPaths();
      return paths.length;
    }
    case "authors": {
      const { count } = await db
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("username", "is", null)
        .eq("status", "active");
      return count ?? 0;
    }
    case "posts": {
      const [{ count: posts }, { count: announcements }] = await Promise.all([
        db
          .from("admin_content_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "published")
          .eq("indexable", true)
          .not("public_code", "is", null),
        db
          .from("platform_announcements")
          .select("*", { count: "exact", head: true })
          .eq("status", "published")
          .eq("visibility", "public")
          .eq("indexable", true)
          .not("public_code", "is", null)
      ]);
      return (posts ?? 0) + (announcements ?? 0);
    }
    case "policies": {
      const { count } = await db
        .from("policy_pages")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .eq("visibility", "public")
        .eq("seo_indexable", true)
        .not("public_code", "is", null);
      return count ?? 0;
    }
    case "reels": {
      const { count } = await db
        .from("reels_items")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .not("public_code", "is", null);
      return count ?? 0;
    }
    default:
      return 0;
  }
}
