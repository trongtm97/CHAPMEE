/**
 * Lightweight self-test for SEO metadata engine (no DB required for template/robots paths).
 *
 *   npx --yes tsx scripts/test-seo-metadata-resolver.ts
 */

import { createNextMetadata } from "@/lib/seo/create-next-metadata";
import { resolveSeoMetadata } from "@/lib/seo/resolve-seo-metadata";
import { DEFAULT_SEO_SETTINGS_FALLBACK } from "@/lib/seo/seo-service";
import { interpolateSeoTemplate } from "@/lib/seo/seo-template";
import { getDefaultSeoTemplate } from "@/lib/seo/seo-template";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function main() {
  const title = interpolateSeoTemplate("{story_title} | {site_name}", {
    story_title: "Nhất Niệm Vĩnh Hằng",
    site_name: "ChapMee"
  });
  assert(title === "Nhất Niệm Vĩnh Hằng | ChapMee", "template interpolation basic");

  const stripped = interpolateSeoTemplate("{story_title} - {chapter_title} | {site_name}", {
    story_title: "Demo",
    site_name: "ChapMee"
  });
  assert(!stripped.includes("{"), "missing vars stripped");
  assert(stripped.includes("Demo") && stripped.includes("ChapMee"), "partial vars collapsed");

  const storyTemplate = getDefaultSeoTemplate("story_detail");
  assert(Boolean(storyTemplate?.title_template), "story template loaded");

  const storyResult = await resolveSeoMetadata(
    {
      path: "/truyen/demo-s.12345678",
      pageType: "story_detail",
      targetType: "story",
      targetId: "00000000-0000-0000-0000-000000000001",
      entityData: {
        storyTitle: "Truyện Demo",
        authorName: "Tác Giả A",
        shortDescription: "Một câu chuyện demo cho SEO engine.",
        canonicalPath: "/truyen/demo-s.12345678",
        contentStatus: "published"
      }
    },
    {
      preload: {
        override: null,
        template: storyTemplate,
        settings: { ...DEFAULT_SEO_SETTINGS_FALLBACK, id: "test", createdAt: new Date(), updatedAt: new Date(), defaultOgImageAssetId: null }
      }
    }
  );

  assert(storyResult.title.includes("Truyện Demo"), "story title from entity");
  assert(storyResult.description.length > 0, "story description present");
  assert(storyResult.sources.entity === true, "entity source flagged");
  assert(
    typeof storyResult.robots === "object" && storyResult.robots?.index === true,
    "published story indexable"
  );
  assert(Boolean(storyResult.openGraph?.title), "openGraph title set");

  const privateResult = await resolveSeoMetadata(
    {
      path: "/login",
      pageType: "static",
      isPrivatePage: true,
      fallbackTitle: "Đăng nhập"
    },
    {
      preload: {
        override: null,
        template: null,
        settings: { ...DEFAULT_SEO_SETTINGS_FALLBACK, id: "test", createdAt: new Date(), updatedAt: new Date(), defaultOgImageAssetId: null }
      }
    }
  );

  assert(
    typeof privateResult.robots === "object" && privateResult.robots?.index === false,
    "private page noindex"
  );
  assert(privateResult.alternates?.canonical === undefined, "private page no canonical");

  const nextMeta = createNextMetadata(storyResult);
  assert(typeof nextMeta.title === "string", "createNextMetadata title");

  console.log("\n--- Sample story metadata ---");
  console.log(JSON.stringify(
    {
      title: storyResult.title,
      description: storyResult.description,
      canonical: storyResult.alternates?.canonical,
      robots: storyResult.robots,
      openGraph: storyResult.openGraph,
      twitter: storyResult.twitter,
      warnings: storyResult.warnings
    },
    null,
    2
  ));

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\nAll SEO metadata resolver checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
