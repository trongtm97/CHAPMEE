"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/utilities/CopyButton";
import { UtilityActionBar, UtilityActionSecondaryButton, utilityActionSecondaryClassName } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  getTextStats,
  processText,
  type CaseMode
} from "@/lib/utilities/vietnamese-tone-remover";

const DOWNLOAD_FILENAME = "xoa-dau-tieng-viet.txt";

const EXAMPLES = [
  {
    input: "Cộng hòa xã hội chủ nghĩa Việt Nam",
    output: "Cong hoa xa hoi chu nghia Viet Nam"
  },
  {
    input: "Nguyễn Văn Đạt",
    output: "Nguyen Van Dat"
  },
  {
    input: "Áo thun nam mùa hè 2026",
    output: "Ao thun nam mua he 2026",
    slug: "ao-thun-nam-mua-he-2026"
  },
  {
    input: "Đây là công cụ xóa dấu tiếng Việt miễn phí.",
    output: "Day la cong cu xoa dau tieng Viet mien phi."
  }
] as const;

const CASE_OPTIONS: { value: CaseMode; label: string }[] = [
  { value: "preserve", label: "Giữ nguyên" },
  { value: "lowercase", label: "chữ thường" },
  { value: "uppercase", label: "CHỮ HOA" },
  { value: "titlecase", label: "Viết Hoa Chữ Cái Đầu" }
];

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VietnameseToneRemover() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [caseMode, setCaseMode] = useState<CaseMode>("preserve");
  const [slugMode, setSlugMode] = useState(false);
  const [removeSpecialChars, setRemoveSpecialChars] = useState(false);
  const [normalizeSpacesOption, setNormalizeSpacesOption] = useState(false);
  const [replaceSpacesOption, setReplaceSpacesOption] = useState(false);
  const [spaceDelimiter, setSpaceDelimiter] = useState("-");
  const [copyError, setCopyError] = useState<string | null>(null);

  const stats = useMemo(() => getTextStats(input), [input]);

  const runProcess = useCallback(() => {
    const result = processText(input, {
      caseMode,
      slug: slugMode,
      removeSpecialChars,
      normalizeSpaces: normalizeSpacesOption,
      replaceSpaces: replaceSpacesOption,
      spaceDelimiter: spaceDelimiter || "-"
    });
    setOutput(result);
  }, [
    input,
    caseMode,
    slugMode,
    removeSpecialChars,
    normalizeSpacesOption,
    replaceSpacesOption,
    spaceDelimiter
  ]);

  useEffect(() => {
    runProcess();
  }, [runProcess]);

  const handleCopy = useCallback(async () => {
    if (!output) {
      setCopyError("Chưa có nội dung để sao chép.");
      window.setTimeout(() => setCopyError(null), 3000);
      return false;
    }

    const ok = await copyToClipboard(output);
    if (!ok) {
      setCopyError("Không thể sao chép. Hãy thử chọn thủ công.");
      window.setTimeout(() => setCopyError(null), 3000);
    }
    return ok;
  }, [output]);

  const handleClear = () => {
    setInput("");
    setOutput("");
    setCopyError(null);
  };

  const handleDownload = () => {
    if (!output) return;
    downloadTextFile(output, DOWNLOAD_FILENAME);
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Xóa Dấu Tiếng Việt</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Chuyển tiếng Việt có dấu sang không dấu nhanh chóng, hỗ trợ tạo slug SEO, đổi chữ hoa/thường
          và sao chép chỉ với một click.
        </p>
      </header>

      <div className="space-y-2">
        <label className="sr-only" htmlFor="tone-remover-input">
          Nhập văn bản
        </label>
        <textarea
          className="min-h-[140px] w-full resize-y rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
          id="tone-remover-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Nhập hoặc dán văn bản tiếng Việt có dấu vào đây..."
          value={input}
        />
      </div>

      <fieldset className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Kết quả
        </legend>
        <label className="sr-only" htmlFor="tone-remover-output">
          Kết quả
        </label>
        <textarea
          className="min-h-[120px] w-full resize-y rounded-2xl border border-cyan-300/20 bg-cyan-950/25 px-4 py-3 text-sm text-cyan-50 placeholder:text-zinc-500 focus:outline-none"
          id="tone-remover-output"
          placeholder="Kết quả sẽ hiển thị tại đây..."
          readOnly
          value={output}
        />
      </fieldset>

      <UtilityActionBar primary={{ label: "Xóa dấu", onClick: runProcess }}>
        <CopyButton className={utilityActionSecondaryClassName} label="Sao chép" onCopy={handleCopy} />
        <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
        <UtilityActionSecondaryButton disabled={!output} label="Tải TXT" onClick={handleDownload} />
      </UtilityActionBar>

      {copyError ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
          {copyError}
        </p>
      ) : null}

      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Tùy chọn
        </legend>

        <div className="flex flex-wrap gap-2">
          {CASE_OPTIONS.map((option) => (
            <label
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                caseMode === option.value && !slugMode
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20"
              } ${slugMode ? "pointer-events-none opacity-40" : ""}`}
              key={option.value}
            >
              <input
                checked={caseMode === option.value}
                className="sr-only"
                disabled={slugMode}
                name="case-mode"
                onChange={() => setCaseMode(option.value)}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={slugMode}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              onChange={(event) => setSlugMode(event.target.checked)}
              type="checkbox"
            />
            Tạo slug SEO (giữ từng dòng)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={removeSpecialChars}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              disabled={slugMode}
              onChange={(event) => setRemoveSpecialChars(event.target.checked)}
              type="checkbox"
            />
            Xóa ký tự đặc biệt
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={normalizeSpacesOption}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              disabled={slugMode}
              onChange={(event) => setNormalizeSpacesOption(event.target.checked)}
              type="checkbox"
            />
            Xóa khoảng trắng thừa
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={replaceSpacesOption}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              disabled={slugMode}
              onChange={(event) => setReplaceSpacesOption(event.target.checked)}
              type="checkbox"
            />
            Thay dấu cách bằng
          </label>
          <input
            aria-label="Ký tự thay thế dấu cách"
            className="w-14 rounded-lg border border-white/15 bg-zinc-900/90 px-2 py-1 text-center text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={slugMode || !replaceSpacesOption}
            maxLength={4}
            onChange={(event) => setSpaceDelimiter(event.target.value)}
            type="text"
            value={spaceDelimiter}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
        <span>
          Ký tự: <strong className="font-semibold text-zinc-200">{stats.characters}</strong>
        </span>
        <span>
          Từ: <strong className="font-semibold text-zinc-200">{stats.words}</strong>
        </span>
        <span>
          Dòng: <strong className="font-semibold text-zinc-200">{stats.lines}</strong>
        </span>
      </div>

      <section aria-labelledby="tone-remover-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="tone-remover-examples">
          Một vài ví dụ mẫu
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map((example) => (
            <article
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm"
              key={example.input}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Có dấu</p>
              <p className="mt-1 text-zinc-200">{example.input}</p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Không dấu
              </p>
              <p className="mt-1 text-cyan-100/90">{example.output}</p>
              {"slug" in example && example.slug ? (
                <>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Slug SEO
                  </p>
                  <p className="mt-1 font-mono text-xs text-zinc-300">{example.slug}</p>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
