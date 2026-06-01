import { ADMIN_ONLY_TAXONOMY_TYPES } from "@/lib/taxonomy/constants";
import type { TaxonomyType } from "@/types/taxonomy";
import type { UpsertTaxonomyTermInput } from "@/lib/taxonomy/admin-data";

export function defaultFlagsForType(type: TaxonomyType): Partial<UpsertTaxonomyTermInput> {
  const adminOnly = ADMIN_ONLY_TAXONOMY_TYPES.includes(type);
  return {
    is_selectable_by_creator: !adminOnly,
    use_for_moderation: type === "content_warning",
    use_for_seo: true,
    use_for_discover: true,
    use_for_ranking: type === "main_genre" || type === "subgenre"
  };
}

export function validateTaxonomyTermInput(
  input: UpsertTaxonomyTermInput,
  options?: { termId?: string; parentChainIds?: string[] }
): string | null {
  if (!input.name?.trim()) return "Tên là bắt buộc.";
  if (!input.slug?.trim()) return "Slug là bắt buộc.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim())) {
    return "Slug chỉ dùng chữ thường, số và dấu gạch ngang.";
  }

  if (input.parent_id && options?.termId && input.parent_id === options.termId) {
    return "Không thể chọn chính mình làm parent.";
  }

  if (input.parent_id && options?.parentChainIds?.includes(input.parent_id)) {
    return "Parent tạo vòng lặp phân cấp.";
  }

  if (
    input.is_selectable_by_creator &&
    ADMIN_ONLY_TAXONOMY_TYPES.includes(input.type)
  ) {
    return "Nhóm hệ thống không cho creator chọn trực tiếp.";
  }

  return null;
}

export function parseAliasesInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((part) => part.trim())
        .filter(Boolean)
    )
  ];
}
