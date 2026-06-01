"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { createTaxonomyRequestAction } from "@/lib/creator/create-taxonomy-request-action";
import {
  CREATOR_ASSIGNABLE_TAXONOMY_TYPES,
  TAXONOMY_TYPE_LABELS
} from "@/lib/taxonomy/constants";
import type { TaxonomyType } from "@/types/taxonomy";

const REQUESTABLE_TYPES = CREATOR_ASSIGNABLE_TAXONOMY_TYPES.filter(
  (type) => type !== "presentation_mode" && type !== "age_rating"
);

const initialState = { ok: false, error: null as string | null };

type MainGenreOption = { id: string; name: string; slug: string };

export function TaxonomyRequestPanel() {
  const [state, action, pending] = useActionState(
    createTaxonomyRequestAction,
    initialState
  );
  const [requestType, setRequestType] = useState<TaxonomyType>("trope_tag");
  const [mainGenres, setMainGenres] = useState<MainGenreOption[]>([]);

  useEffect(() => {
    if (requestType !== "subgenre") {
      return;
    }

    void fetch("/api/taxonomy/terms?type=main_genre&scope=creator")
      .then((res) => res.json())
      .then((body) => {
        const list = Array.isArray(body.data) ? body.data : [];
        setMainGenres(
          list.map((row: { id: string; name: string; slug: string }) => ({
            id: String(row.id),
            name: String(row.name),
            slug: String(row.slug)
          }))
        );
      })
      .catch(() => setMainGenres([]));
  }, [requestType]);

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-bold text-white">Đề xuất nhãn mới</p>
        <p className="mt-1 text-xs text-zinc-500">
          Không tự tạo tag — gửi yêu cầu để admin xét duyệt.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Nhóm</span>
          <select
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white"
            name="type"
            onChange={(event) =>
              setRequestType(event.target.value as TaxonomyType)
            }
            required
            value={requestType}
          >
            {REQUESTABLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {TAXONOMY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        {requestType === "subgenre" ? (
          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Thuộc thể loại chính</span>
            <select
              className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white"
              name="related_existing_term_id"
            >
              <option value="">— Chọn (khuyến nghị) —</option>
              {mainGenres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Input label="Tên đề xuất" name="name" required />
        <Textarea
          label="Mô tả"
          name="description"
          placeholder="Giải thích ngắn nhãn này dùng cho truyện thế nào."
          rows={3}
        />
        <Textarea
          label="Ví dụ"
          name="example_usage"
          placeholder="Ví dụ truyện hoặc tình huống dùng nhãn."
          rows={2}
        />
        {state.error ? (
          <p className="text-sm text-red-300">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-emerald-300">
            Đã gửi yêu cầu. Admin sẽ xét duyệt.
          </p>
        ) : null}
        <Button loading={pending} type="submit" variant="secondary">
          Gửi yêu cầu
        </Button>
      </form>
    </Card>
  );
}
