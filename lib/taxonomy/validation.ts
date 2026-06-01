import {
  ADMIN_ONLY_TAXONOMY_TYPES,
  CREATOR_ASSIGNABLE_TAXONOMY_TYPES,
  PUBLISH_REQUIRED_TAXONOMY_TYPES,
  STORY_TAXONOMY_LIMITS
} from "@/lib/taxonomy/constants";
import { getTaxonomyTermsByIds } from "@/lib/taxonomy/queries";
import type {
  StoryTaxonomySelectionInput,
  StoryTaxonomyValidationResult,
  TaxonomyTerm,
  TaxonomyType
} from "@/types/taxonomy";
import { TAXONOMY_TYPES } from "@/types/taxonomy";

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function countByType(terms: TaxonomyTerm[]) {
  const counts = new Map<TaxonomyType, number>();
  for (const term of terms) {
    counts.set(term.type, (counts.get(term.type) ?? 0) + 1);
  }
  return counts;
}

export function validateStoryTaxonomySelectionLimits(
  terms: TaxonomyTerm[],
  options?: { forPublish?: boolean; contentWarningsConfirmed?: boolean }
): StoryTaxonomyValidationResult {
  const errors: string[] = [];
  const counts = countByType(terms);
  const normalized: Partial<Record<TaxonomyType, string[]>> = {};

  for (const term of terms) {
    if (!normalized[term.type]) normalized[term.type] = [];
    normalized[term.type]!.push(term.id);
  }

  for (const type of TAXONOMY_TYPES) {
    const limit = STORY_TAXONOMY_LIMITS[type];
    if (!limit) continue;
    const count = counts.get(type) ?? 0;
    if (limit.required && count < (limit.min ?? 1)) {
      errors.push(`Thiếu nhãn bắt buộc: ${type}.`);
    }
    if (count > limit.max) {
      errors.push(`Vượt quá số lượng cho phép (${limit.max}) với ${type}.`);
    }
  }

  if (options?.forPublish) {
    for (const type of PUBLISH_REQUIRED_TAXONOMY_TYPES) {
      if ((counts.get(type) ?? 0) < 1) {
        errors.push(`Cần chọn ${type} trước khi xuất bản.`);
      }
    }
    if (!options.contentWarningsConfirmed) {
      errors.push(
        "Cần xác nhận cảnh báo nội dung (có hoặc không có cảnh báo)."
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, normalized };
}

export async function validateStoryTaxonomySelection(
  input: StoryTaxonomySelectionInput,
  options?: {
    forPublish?: boolean;
    allowAdminTypes?: boolean;
  }
): Promise<StoryTaxonomyValidationResult> {
  const allIds = uniqueIds(
    Object.values(input.selections ?? {}).flatMap((ids) => ids ?? [])
  );

  const hasPresentation =
    Boolean(input.presentationMode?.trim()) ||
    (input.selections?.presentation_mode?.length ?? 0) > 0;

  if (allIds.length === 0 && !hasPresentation) {
    const publishErrors: string[] = [];
    if (options?.forPublish) {
      for (const type of PUBLISH_REQUIRED_TAXONOMY_TYPES) {
        publishErrors.push(`Cần chọn ${type} trước khi xuất bản.`);
      }
      if (!input.contentWarningsConfirmed) {
        publishErrors.push(
          "Cần xác nhận cảnh báo nội dung (có hoặc không có cảnh báo)."
        );
      }
    }
    if (publishErrors.length > 0) {
      return { ok: false, errors: publishErrors };
    }
    return { ok: true, normalized: {} };
  }

  const { data: terms, error } = await getTaxonomyTermsByIds(allIds);
  if (error) {
    return { ok: false, errors: [error] };
  }

  if (terms.length !== allIds.length) {
    return {
      ok: false,
      errors: ["Một hoặc nhiều nhãn taxonomy không tồn tại hoặc đã bị tắt."]
    };
  }

  const errors: string[] = [];

  for (const term of terms) {
    if (!term.is_active) {
      errors.push(`Nhãn "${term.name}" không còn hoạt động.`);
    }
    if (!term.is_public) {
      errors.push(`Nhãn "${term.name}" không khả dụng.`);
    }
    if (
      !options?.allowAdminTypes &&
      ADMIN_ONLY_TAXONOMY_TYPES.includes(term.type)
    ) {
      errors.push(`Không được gắn nhãn hệ thống: ${term.name}.`);
    }
    if (
      !options?.allowAdminTypes &&
      !term.is_selectable_by_creator &&
      CREATOR_ASSIGNABLE_TAXONOMY_TYPES.includes(term.type)
    ) {
      errors.push(`Nhãn "${term.name}" chỉ dành cho quản trị.`);
    }
  }

  const inputCounts = new Map<TaxonomyType, number>();
  for (const ids of Object.values(input.selections ?? {})) {
    for (const id of ids ?? []) {
      const term = terms.find((t) => t.id === id);
      if (!term) continue;
      inputCounts.set(term.type, (inputCounts.get(term.type) ?? 0) + 1);
    }
  }

  for (const [type, count] of inputCounts) {
    const limit = STORY_TAXONOMY_LIMITS[type];
    if (limit && count > limit.max) {
      errors.push(`Vượt quá số lượng cho phép (${limit.max}) với ${type}.`);
    }
  }

  if (options?.forPublish && !hasPresentation) {
    errors.push("Cần chọn presentation_mode trước khi xuất bản.");
  }

  const limitResult = validateStoryTaxonomySelectionLimits(terms, {
    forPublish: options?.forPublish,
    contentWarningsConfirmed: input.contentWarningsConfirmed
  });

  if (!limitResult.ok) {
    errors.push(...limitResult.errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  return limitResult;
}
