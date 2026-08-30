import type { PostgrestRow } from "@/lib/db/postgrest-row";
import { parseTemplateContent } from "@/lib/studio/template-content";
import type { StudioTemplateRecord, StudioTemplateType } from "@/types/templates";

type TemplateRow = {
  id: string;
  owner_id: string | null;
  template_type: string;
  title: string;
  description: string | null;
  content: unknown;
  plain_text: string | null;
  is_system: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export function mapTemplateRow(row: TemplateRow | PostgrestRow): StudioTemplateRecord {
  return {
    content: parseTemplateContent(row.content),
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isSystem: row.is_system,
    ownerId: row.owner_id,
    plainText: row.plain_text,
    status: row.status === "archived" ? "archived" : "active",
    templateType: row.template_type as StudioTemplateType,
    title: row.title,
    updatedAt: row.updated_at
  };
}
