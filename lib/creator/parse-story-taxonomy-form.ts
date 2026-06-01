export type ParsedStoryTaxonomyForm = {
  taxonomyTermIds: string[];
  presentationMode: string | null;
  formatTemplateId: string | null;
  contentWarningsConfirmed: boolean;
};

export function parseStoryTaxonomyFormFields(
  formData: FormData
): ParsedStoryTaxonomyForm {
  const presentationMode =
    String(formData.get("presentation_mode") ?? "").trim() || null;

  const formatTemplateId =
    String(formData.get("format_template_id") ?? "").trim() || null;

  return {
    taxonomyTermIds: formData.getAll("taxonomy_terms").map(String).filter(Boolean),
    presentationMode,
    formatTemplateId,
    contentWarningsConfirmed: formData.get("content_warnings_confirmed") === "on"
  };
}
