"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TaxonomyMultiPicker,
  TaxonomyPresentationHint,
  TaxonomySinglePicker
} from "@/components/studio/taxonomy/TaxonomyFieldPickers";
import { FormatTemplateExamplePanel } from "@/components/studio/stories/FormatTemplateExamplePanel";
import {
  isPresentationMode,
  modeUsesStructuredContent
} from "@/lib/presentation/constants";
import { filterTermsByParent } from "@/lib/taxonomy/parent-types";
import {
  DEPRECATED_CONTENT_TYPE_SLUGS,
  STORY_FORM_CONTENT_TYPE_SLUGS,
  STORY_TAXONOMY_LIMITS
} from "@/lib/taxonomy/constants";
import type { StoryFormTaxonomyBundle } from "@/lib/creator/get-story-form-taxonomy";
import type { TaxonomyType } from "@/types/taxonomy";

export type StoryTaxonomySelection = {
  ageRatingId: string;
  contentTypeId: string;
  contentWarningIds: string[];
  contentWarningsConfirmed: boolean;
  formatTemplateId: string;
  mainGenreId: string;
  optionalTermIds: Partial<Record<TaxonomyType, string[]>>;
  presentationMode: string;
  warningMode: "none" | "has";
};

type StoryTaxonomyFieldsProps = {
  bundle: StoryFormTaxonomyBundle;
  disabled?: boolean;
  collapsibleAdvanced?: boolean;
  onPresentationModeChange?: (mode: string) => void;
  onSelectionChange?: (selection: StoryTaxonomySelection) => void;
};

const OPTIONAL_MULTI: TaxonomyType[] = [
  "subgenre",
  "trope_tag",
  "setting_tag",
  "character_tag",
  "relationship_tag",
  "narrative_style",
  "reader_experience"
];

function buildInitialOptional(
  bundle: StoryFormTaxonomyBundle
): Partial<Record<TaxonomyType, string[]>> {
  const map: Partial<Record<TaxonomyType, string[]>> = {};
  for (const type of OPTIONAL_MULTI) {
    const ids = bundle.selectedByType[type];
    if (ids?.length) {
      map[type] = [...ids];
    }
  }
  return map;
}

export function buildStoryTaxonomySelectionFromBundle(
  bundle: StoryFormTaxonomyBundle
): StoryTaxonomySelection {
  return {
    ageRatingId: bundle.selectedByType.age_rating?.[0] ?? "",
    contentTypeId: bundle.selectedByType.content_type?.[0] ?? "",
    contentWarningIds: bundle.selectedByType.content_warning ?? [],
    contentWarningsConfirmed: bundle.contentWarningsConfirmed,
    formatTemplateId: bundle.selectedFormatTemplateId ?? "",
    mainGenreId: bundle.selectedByType.main_genre?.[0] ?? "",
    optionalTermIds: buildInitialOptional(bundle),
    presentationMode: bundle.presentationMode ?? "standard_prose",
    warningMode:
      (bundle.selectedByType.content_warning?.length ?? 0) > 0 ? "has" : "none"
  };
}

export function StoryTaxonomyFields({
  bundle,
  collapsibleAdvanced = false,
  disabled = false,
  onPresentationModeChange,
  onSelectionChange
}: StoryTaxonomyFieldsProps) {
  const initialSelection = buildStoryTaxonomySelectionFromBundle(bundle);
  const [contentTypeId, setContentTypeId] = useState(initialSelection.contentTypeId);
  const [mainGenreId, setMainGenreId] = useState(initialSelection.mainGenreId);
  const [ageRatingId, setAgeRatingId] = useState(initialSelection.ageRatingId);
  const [presentationMode, setPresentationMode] = useState(
    initialSelection.presentationMode
  );
  const [formatTemplateId, setFormatTemplateId] = useState(
    initialSelection.formatTemplateId
  );
  const [optionalTermIds, setOptionalTermIds] = useState(
    initialSelection.optionalTermIds
  );
  const [contentWarningIds, setContentWarningIds] = useState(
    initialSelection.contentWarningIds
  );
  const [contentWarningsConfirmed, setContentWarningsConfirmed] = useState(
    initialSelection.contentWarningsConfirmed
  );
  const [warningMode, setWarningMode] = useState(initialSelection.warningMode);

  const formatTemplates = bundle.formatTemplatesByMode[presentationMode] ?? [];

  const contentTypeTerms = useMemo(() => {
    const allowed = new Set<string>(STORY_FORM_CONTENT_TYPE_SLUGS);
    return (bundle.optionsByType.content_type ?? []).filter(
      (term) =>
        allowed.has(term.slug) &&
        !DEPRECATED_CONTENT_TYPE_SLUGS.includes(
          term.slug as (typeof DEPRECATED_CONTENT_TYPE_SLUGS)[number]
        )
    );
  }, [bundle.optionsByType.content_type]);

  const subgenres = useMemo(
    () =>
      filterTermsByParent(
        bundle.optionsByType.subgenre ?? [],
        mainGenreId || undefined
      ),
    [bundle.optionsByType.subgenre, mainGenreId]
  );

  function emit(patch: Partial<StoryTaxonomySelection>) {
    const next: StoryTaxonomySelection = {
      ageRatingId,
      contentTypeId,
      contentWarningIds,
      contentWarningsConfirmed,
      formatTemplateId,
      mainGenreId,
      optionalTermIds,
      presentationMode,
      warningMode,
      ...patch
    };
    onSelectionChange?.(next);
  }

  function updateOptional(type: TaxonomyType, ids: string[]) {
    const next = { ...optionalTermIds, [type]: ids };
    setOptionalTermIds(next);
    emit({ optionalTermIds: next });
  }

  function handleMainGenreChange(value: string) {
    setMainGenreId(value);
    const nextOptional = { ...optionalTermIds, subgenre: [] as string[] };
    setOptionalTermIds(nextOptional);
    emit({ mainGenreId: value, optionalTermIds: nextOptional });
  }

  const hasAnyTaxonomy = useMemo(
    () =>
      OPTIONAL_MULTI.some((type) => (bundle.optionsByType[type]?.length ?? 0) > 0) ||
      (bundle.optionsByType.content_type?.length ?? 0) > 0 ||
      (bundle.optionsByType.main_genre?.length ?? 0) > 0 ||
      (bundle.optionsByType.age_rating?.length ?? 0) > 0 ||
      (bundle.optionsByType.presentation_mode?.length ?? 0) > 0,
    [bundle.optionsByType]
  );

  if (!bundle.enabled) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-500">
        Phân loại chưa được cấu hình — liên hệ quản trị để bật taxonomy trước khi
        xuất bản truyện.
      </p>
    );
  }

  if (!hasAnyTaxonomy) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-4 text-sm text-amber-100">
        <p className="font-semibold">Chưa có danh mục phân loại</p>
        <p className="mt-1 text-amber-100/80">
          Quản trị cần bật taxonomy trước khi tác giả phân loại truyện. Bạn vẫn có
          thể lưu nháp với thông tin cơ bản.
        </p>
      </div>
    );
  }

  const subgenreField =
    !mainGenreId ? (
      <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <span className="text-sm font-bold text-zinc-200">Thể loại phụ</span>
        <p className="text-xs text-zinc-500">
          Chọn thể loại chính trước để xem thể loại phụ phù hợp.
        </p>
      </div>
    ) : subgenres.length > 0 ? (
      <TaxonomyMultiPicker
        disabled={disabled}
        max={STORY_TAXONOMY_LIMITS.subgenre?.max ?? 3}
        onChange={(ids) => updateOptional("subgenre", ids)}
        selectedIds={optionalTermIds.subgenre ?? []}
        terms={subgenres}
        type="subgenre"
      />
    ) : (
      <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <span className="text-sm font-bold text-zinc-200">Thể loại phụ</span>
        <p className="text-xs text-zinc-500">
          Chưa có thể loại phụ cho thể loại chính này.
        </p>
      </div>
    );

  const advancedFields = (
    <>
      {OPTIONAL_MULTI.filter((type) => type !== "subgenre").map((type) => {
        const terms = bundle.optionsByType[type];
        if (!terms?.length) return null;
        return (
          <TaxonomyMultiPicker
            disabled={disabled}
            key={type}
            max={STORY_TAXONOMY_LIMITS[type]?.max}
            onChange={(ids) => updateOptional(type, ids)}
            selectedIds={optionalTermIds[type] ?? []}
            terms={terms}
            type={type}
          />
        );
      })}
    </>
  );

  return (
    <section className="space-y-6">
      <input name="use_taxonomy" type="hidden" value="1" />

      <div className="grid gap-5 lg:grid-cols-2">
        {(contentTypeTerms.length ?? 0) > 0 ? (
          <TaxonomySinglePicker
            disabled={disabled}
            onChange={(value) => {
              setContentTypeId(value);
              emit({ contentTypeId: value });
            }}
            required
            terms={contentTypeTerms}
            type="content_type"
            value={contentTypeId}
          />
        ) : null}
        {(bundle.optionsByType.main_genre?.length ?? 0) > 0 ? (
          <TaxonomySinglePicker
            disabled={disabled}
            onChange={handleMainGenreChange}
            required
            terms={bundle.optionsByType.main_genre ?? []}
            type="main_genre"
            value={mainGenreId}
          />
        ) : null}
        {(bundle.optionsByType.age_rating?.length ?? 0) > 0 ? (
          <TaxonomySinglePicker
            disabled={disabled}
            onChange={(value) => {
              setAgeRatingId(value);
              emit({ ageRatingId: value });
            }}
            required
            terms={bundle.optionsByType.age_rating ?? []}
            type="age_rating"
            value={ageRatingId}
          />
        ) : null}
        {(bundle.optionsByType.presentation_mode?.length ?? 0) > 0 ? (
          <div className="space-y-1">
            <TaxonomySinglePicker
              disabled={disabled}
              onChange={(value) => {
                setPresentationMode(value);
                setFormatTemplateId("");
                onPresentationModeChange?.(value);
                emit({ presentationMode: value, formatTemplateId: "" });
              }}
              required
              terms={bundle.optionsByType.presentation_mode ?? []}
              type="presentation_mode"
              value={presentationMode}
            />
            <TaxonomyPresentationHint mode={presentationMode} />
            {formatTemplates.length > 0 ? (
              <label className="mt-2 block space-y-1 text-sm">
                <span className="text-xs font-semibold text-zinc-400">
                  Mẫu format (tùy chọn)
                </span>
                <select
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                  disabled={disabled}
                  name="format_template_id"
                  onChange={(event) => {
                    setFormatTemplateId(event.target.value);
                    emit({ formatTemplateId: event.target.value });
                  }}
                  value={formatTemplateId}
                >
                  <option value="">Không chọn mẫu</option>
                  {formatTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {isPresentationMode(presentationMode) &&
                modeUsesStructuredContent(presentationMode) &&
                formatTemplateId ? (
                  <FormatTemplateExamplePanel
                    formatTemplateId={formatTemplateId}
                    presentationMode={presentationMode}
                    templates={formatTemplates}
                  />
                ) : null}
              </label>
            ) : (
              <input name="format_template_id" type="hidden" value="" />
            )}
          </div>
        ) : (
          <input name="presentation_mode" type="hidden" value={presentationMode} />
        )}
      </div>

      {subgenreField}

      {collapsibleAdvanced ? (
        <details className="group rounded-xl border border-white/10 bg-zinc-950/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Phân loại nâng cao
              <span className="text-xs font-normal text-zinc-500 group-open:hidden">
                Mở rộng
              </span>
            </span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3">
            {advancedFields}
          </div>
        </details>
      ) : (
        <div className="space-y-4">{advancedFields}</div>
      )}

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-bold text-white">Cảnh báo nội dung</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              checked={warningMode === "none"}
              disabled={disabled}
              name="content_warning_mode"
              onChange={() => {
                setWarningMode("none");
                setContentWarningIds([]);
                emit({ warningMode: "none", contentWarningIds: [] });
              }}
              type="radio"
              value="none"
            />
            Không có cảnh báo đặc biệt
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              checked={warningMode === "has"}
              disabled={disabled}
              name="content_warning_mode"
              onChange={() => {
                setWarningMode("has");
                emit({ warningMode: "has" });
              }}
              type="radio"
              value="has"
            />
            Có cảnh báo nội dung
          </label>
        </div>
        {warningMode === "has" ? (
          (bundle.optionsByType.content_warning?.length ?? 0) > 0 ? (
            <TaxonomyMultiPicker
              disabled={disabled}
              onChange={(ids) => {
                setContentWarningIds(ids);
                emit({ contentWarningIds: ids });
              }}
              selectedIds={contentWarningIds}
              terms={bundle.optionsByType.content_warning ?? []}
              type="content_warning"
            />
          ) : (
            <p className="text-xs text-zinc-500">
              Chưa có danh sách cảnh báo — liên hệ quản trị.
            </p>
          )
        ) : (
          <input name="taxonomy_terms_clear_warnings" type="hidden" value="1" />
        )}
      </div>

      <input name="content_warnings_confirmed" type="hidden" value="on" />

      <p className="text-center text-xs text-zinc-600">
        Không thấy mục phù hợp?{" "}
        <Link className="text-cyan-400/80 hover:text-cyan-300" href="/studio/help">
          Gửi đề xuất taxonomy
        </Link>
      </p>
    </section>
  );
}
