"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  duplicateFormatTemplateAdminAction,
  listFormatTemplatesAdminAction,
  saveFormatTemplateAdminAction
} from "@/lib/admin/taxonomy-actions";
import { PRESENTATION_MODE_SLUGS } from "@/lib/taxonomy/constants";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";
import type { StoryFormatTemplateRow } from "@/types/taxonomy";

type TaxonomyTemplatesPanelProps = {
  onMessage: TaxonomyAdminNotify;
};

export function TaxonomyTemplatesPanel({ onMessage }: TaxonomyTemplatesPanelProps) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<StoryFormatTemplateRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoryFormatTemplateRow | null>(null);
  const [mode, setMode] = useState("standard_prose");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schemaText, setSchemaText] = useState("{}");
  const [exampleText, setExampleText] = useState("{}");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listFormatTemplatesAdminAction();
      setItems(result.items);
      if (result.error) onMessage(result.error);
    });
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (row: StoryFormatTemplateRow | null) => {
    setFormOpen(true);
    setEditing(row);
    setMode(row?.mode ?? "standard_prose");
    setName(row?.name ?? "");
    setDescription(row?.description ?? "");
    setSchemaText(JSON.stringify(row?.schema_json ?? {}, null, 2));
    setExampleText(JSON.stringify(row?.example_json ?? {}, null, 2));
    setIsActive(row?.is_active ?? true);
    setIsDefault(row?.is_default ?? false);
    setSortOrder(String(row?.sort_order ?? 0));
  };

  let previewParsed: Record<string, unknown> | null = null;
  let schemaParsed: Record<string, unknown> | null = null;
  try {
    previewParsed = JSON.parse(exampleText) as Record<string, unknown>;
  } catch {
    previewParsed = null;
  }
  try {
    schemaParsed = JSON.parse(schemaText) as Record<string, unknown>;
  } catch {
    schemaParsed = null;
  }

  const schemaKeys =
    schemaParsed && typeof schemaParsed === "object"
      ? Object.keys(schemaParsed)
      : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        <p className="text-sm text-zinc-400">
          Template định dạng chương (schema + ví dụ JSON). MVP: textarea + preview đơn giản.
        </p>
        <Button onClick={() => openEdit(null)} type="button">
          Thêm template
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Default</th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-mono text-xs">{row.mode}</td>
                <td className="px-3 py-2 text-white">{row.name}</td>
                <td className="px-3 py-2">{row.is_active ? "✓" : "—"}</td>
                <td className="px-3 py-2">{row.is_default ? "✓" : "—"}</td>
                <td className="px-3 py-2">{row.sort_order}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs text-cyan-300 hover:underline"
                      onClick={() => openEdit(row)}
                      type="button"
                    >
                      Sửa
                    </button>
                    <button
                      className="text-xs text-zinc-400 hover:underline"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await duplicateFormatTemplateAdminAction(row.id);
                          onMessage(result.error);
                          if (!result.error) load();
                        })
                      }
                      type="button"
                    >
                      Nhân bản
                    </button>
                    <button
                      className="text-xs text-zinc-400 hover:underline"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await saveFormatTemplateAdminAction({
                            id: row.id,
                            mode: row.mode,
                            name: row.name,
                            description: row.description,
                            schema_json: row.schema_json,
                            example_json: row.example_json,
                            is_active: !row.is_active,
                            is_default: row.is_default,
                            sort_order: row.sort_order
                          });
                          onMessage(result.error);
                          if (!result.error) load();
                        })
                      }
                      type="button"
                    >
                      {row.is_active ? "Tắt" : "Bật"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="grid gap-4 rounded-xl border border-white/10 bg-[var(--surface)] p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-zinc-400">Mode</span>
              <select
                className="mt-1 min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white"
                onChange={(e) => setMode(e.target.value)}
                value={mode}
              >
                {PRESENTATION_MODE_SLUGS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <input
              className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white"
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên template"
              value={name}
            />
            <textarea
              className="min-h-16 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả"
              value={description}
            />
            <textarea
              className="min-h-32 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"
              onChange={(e) => setSchemaText(e.target.value)}
              placeholder="schema_json"
              value={schemaText}
            />
            <textarea
              className="min-h-32 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"
              onChange={(e) => setExampleText(e.target.value)}
              placeholder="example_json"
              value={exampleText}
            />
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  type="checkbox"
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  type="checkbox"
                />
                Default
              </label>
              <input
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white"
                onChange={(e) => setSortOrder(e.target.value)}
                type="number"
                value={sortOrder}
              />
            </div>
            <div className="flex gap-2">
              <Button
                loading={pending}
                onClick={() => {
                  let schema: Record<string, unknown>;
                  let example: Record<string, unknown>;
                  try {
                    schema = JSON.parse(schemaText) as Record<string, unknown>;
                    example = JSON.parse(exampleText) as Record<string, unknown>;
                  } catch {
                    onMessage("schema_json hoặc example_json không hợp lệ.");
                    return;
                  }
                  startTransition(async () => {
                    const result = await saveFormatTemplateAdminAction({
                      id: editing?.id,
                      mode,
                      name,
                      description: description || null,
                      schema_json: schema,
                      example_json: example,
                      is_active: isActive,
                      is_default: isDefault,
                      sort_order: Number(sortOrder) || 0
                    });
                    if (result.error) {
                      onMessage(result.error);
                      return;
                    }
                    onMessage(editing ? "Đã cập nhật template." : "Đã lưu template.", "success");
                    setFormOpen(false);
                    setEditing(null);
                    setName("");
                    load();
                  });
                }}
                type="button"
              >
                Lưu
              </Button>
              <Button
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                  setName("");
                }}
                type="button"
                variant="secondary"
              >
                Hủy
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
              <p className="text-xs font-medium uppercase text-zinc-500">Schema fields</p>
              {schemaKeys.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-xs text-zinc-400">
                  {schemaKeys.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  {schemaParsed ? "Schema rỗng" : "schema_json không hợp lệ"}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
              <p className="text-xs font-medium uppercase text-zinc-500">Preview example</p>
              <pre className="mt-2 max-h-56 overflow-auto text-xs text-zinc-300">
                {previewParsed
                  ? JSON.stringify(previewParsed, null, 2)
                  : "example_json không hợp lệ"}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
