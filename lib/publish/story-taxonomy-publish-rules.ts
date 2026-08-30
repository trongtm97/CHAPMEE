import { createRule } from "@/lib/publish/checklist-utils";
import {
  PUBLISH_REQUIRED_TAXONOMY_TYPES,
  TAXONOMY_TYPE_LABELS
} from "@/lib/taxonomy/constants";
import { getStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import { getStoryPresentationSettings } from "@/lib/taxonomy/presentation";
import type { PublishChecklistRule } from "@/types/publish-checklist";
import type { DatabaseClient } from "@/lib/db/types";

export async function getStoryTaxonomyPublishRules(
  db: DatabaseClient,
  storyId: string
): Promise<PublishChecklistRule[]> {
  const [{ data: taxonomy }, presentation, storyRow] = await Promise.all([
    getStoryTaxonomy(storyId),
    getStoryPresentationSettings(storyId),
    db
      .from("stories")
      .select("content_warnings_confirmed")
      .eq("id", storyId)
      .maybeSingle()
  ]);

  const rules: PublishChecklistRule[] = [];

  for (const type of PUBLISH_REQUIRED_TAXONOMY_TYPES) {
    if (type === "presentation_mode") {
      rules.push(
        createRule({
          blocking: true,
          id: `taxonomy-${type}`,
          label: `Thiếu ${TAXONOMY_TYPE_LABELS[type]}`,
          message: `Chọn ${TAXONOMY_TYPE_LABELS[type]} trước khi xuất bản.`,
          ok: Boolean(presentation.data?.mode),
          targetType: "story"
        })
      );
      continue;
    }

    const count = taxonomy[type]?.length ?? 0;
    rules.push(
      createRule({
        blocking: true,
        id: `taxonomy-${type}`,
        label: `Thiếu ${TAXONOMY_TYPE_LABELS[type]}`,
        message: `Chọn ${TAXONOMY_TYPE_LABELS[type]} trước khi xuất bản.`,
        ok: count > 0,
        targetType: "story"
      })
    );
  }

  rules.push(
    createRule({
      blocking: true,
      id: "taxonomy-content-warnings-ack",
      label: "Chưa xác nhận cảnh báo nội dung",
      message:
        "Xác nhận cảnh báo nội dung (có hoặc không có) trong form truyện.",
      ok: Boolean(storyRow.data?.content_warnings_confirmed),
      targetType: "story"
    })
  );

  const tropeCount =
    (taxonomy.trope_tag?.length ?? 0) + (taxonomy.subgenre?.length ?? 0);
  rules.push(
    createRule({
      id: "taxonomy-tags",
      label: "Chưa chọn tag/motif",
      message: "Chọn ít nhất một thể loại phụ hoặc motif (khuyến nghị).",
      ok: tropeCount > 0,
      targetType: "story",
      warnIfFail: true
    })
  );

  return rules;
}
