"use client";

import { Input } from "@/components/ui";
import { StudioPolicyNotice } from "@/components/studio/StudioPolicyNotice";
import {
  DEFAULT_TRANSLATED_LANGUAGE,
  DEFAULT_TRANSLATION_TYPE
} from "@/lib/creator/story-translation-defaults";
import {
  STORY_SOURCE_LANGUAGE_OPTIONS,
  STORY_SOURCE_LANGUAGE_OTHER
} from "@/lib/creator/story-source-languages";

export type TranslationMetadata = {
  sourceTitle: string;
  sourceAuthorName: string;
  originalLanguage: string;
  sourceUrl: string;
};

type TranslationMetadataFormProps = {
  disabled?: boolean;
  value: TranslationMetadata;
  onChange: (next: TranslationMetadata) => void;
};

const SELECT_CLASS =
  "min-h-10 w-full max-w-xs rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60";

export function TranslationMetadataForm({
  disabled,
  value,
  onChange
}: TranslationMetadataFormProps) {
  const languageSelectValue = STORY_SOURCE_LANGUAGE_OPTIONS.some(
    (option) => option.value === value.originalLanguage
  )
    ? value.originalLanguage
    : value.originalLanguage.trim()
      ? STORY_SOURCE_LANGUAGE_OTHER
      : "";

  const showCustomLanguage =
    languageSelectValue === STORY_SOURCE_LANGUAGE_OTHER ||
    (value.originalLanguage.trim() !== "" &&
      !STORY_SOURCE_LANGUAGE_OPTIONS.some(
        (option) =>
          option.value === value.originalLanguage &&
          option.value !== STORY_SOURCE_LANGUAGE_OTHER
      ));

  return (
    <section className="space-y-4 rounded-xl border border-amber-300/30 bg-amber-400/5 p-4">
      <input name="translated_language" type="hidden" value={DEFAULT_TRANSLATED_LANGUAGE} />
      <input name="translation_type" type="hidden" value={DEFAULT_TRANSLATION_TYPE} />
      <p className="text-sm font-semibold text-amber-100">Truyện Dịch — Miễn phí 100%</p>
      <p className="text-xs text-amber-100/80">
        Thông tin tác phẩm gốc chỉ dùng nội bộ kiểm tra trùng lặp — không hiển thị cho độc giả.
      </p>
      <StudioPolicyNotice
        tone="amber"
        title="Quy định truyện dịch"
        note="Hãy dịch đúng tinh thần tác phẩm gốc, trau chuốt câu văn và ưu tiên cảm giác đọc tự nhiên với người Việt."
        items={[
          "Không copy 100% nguyên văn từ nguồn khác.",
          "Nên tùy chỉnh câu chữ cho mượt, dễ đọc và phù hợp người Việt.",
          "Không đăng nội dung đồi trụy hoặc vi phạm pháp luật Việt Nam."
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          disabled={disabled}
          label="Tên tác phẩm gốc"
          name="source_title"
          onChange={(event) => onChange({ ...value, sourceTitle: event.target.value })}
          placeholder="Tuỳ chọn — giúp kiểm tra trùng lặp"
          value={value.sourceTitle}
        />
        <Input
          disabled={disabled}
          label="Tác giả gốc"
          name="source_author_name"
          onChange={(event) => onChange({ ...value, sourceAuthorName: event.target.value })}
          placeholder="Tuỳ chọn"
          value={value.sourceAuthorName}
        />
        <label className="block max-w-md space-y-2 md:col-span-1">
          <span className="block text-sm font-bold text-zinc-200">
            Ngôn ngữ gốc <span className="text-rose-300">*</span>
          </span>
          <select
            className={`${SELECT_CLASS} max-w-full`}
            disabled={disabled}
            name="original_language_select"
            onChange={(event) => {
              const next = event.target.value;
              if (next === STORY_SOURCE_LANGUAGE_OTHER) {
                onChange({ ...value, originalLanguage: "" });
                return;
              }
              onChange({ ...value, originalLanguage: next });
            }}
            value={languageSelectValue}
          >
            <option value="">— Chọn ngôn ngữ —</option>
            {STORY_SOURCE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input name="original_language" type="hidden" value={value.originalLanguage} />
        </label>
        {showCustomLanguage ? (
          <Input
            disabled={disabled}
            label="Tên ngôn ngữ khác"
            name="original_language_custom"
            onChange={(event) => onChange({ ...value, originalLanguage: event.target.value.trim() })}
            placeholder="Ví dụ: Tiếng Đức"
            value={
              STORY_SOURCE_LANGUAGE_OPTIONS.some(
                (option) =>
                  option.value === value.originalLanguage &&
                  option.value !== STORY_SOURCE_LANGUAGE_OTHER
              )
                ? ""
                : value.originalLanguage
            }
          />
        ) : null}
        <Input
          className="md:col-span-2"
          disabled={disabled}
          label="Nguồn đăng gốc / source URL"
          labelRequired
          name="source_url"
          onChange={(event) => onChange({ ...value, sourceUrl: event.target.value })}
          placeholder="https://example.com/truyen/abc"
          value={value.sourceUrl}
        />
      </div>
    </section>
  );
}
