"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/utilities/CopyButton";
import { UtilityActionBar, UtilityActionSecondaryButton, utilityActionSecondaryClassName } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  generateCaseResults,
  getTextStats,
  type TextCaseResults
} from "@/lib/utilities/text-case-converter";

const SAMPLE_TEXT = "xin chào việt nam. tôi đang học next.js!";

const EXAMPLES = [
  { input: "xin chào việt nam", output: "Xin chào việt nam" },
  { input: "áo thun nam mùa hè", output: "ÁO THUN NAM MÙA HÈ" },
  { input: "ÁO THUN NAM MÙA HÈ", output: "áo thun nam mùa hè" },
  { input: "xin chào việt nam", output: "Xin Chào Việt Nam" },
  { input: "xin chào. bạn khỏe không?", output: "Xin chào. Bạn khỏe không?" }
] as const;

type ResultKey = keyof TextCaseResults;

const RESULT_CARDS: {
  key: ResultKey;
  label: string;
}[] = [
  { key: "capitalizeFirst", label: "Viết hoa chữ cái đầu tiên" },
  { key: "lower", label: "chữ thường" },
  { key: "upper", label: "CHỮ HOA" },
  { key: "titleCase", label: "Viết Hoa Chữ Cái Đầu Mỗi Từ" },
  { key: "sentenceCase", label: "Viết hoa đầu câu" },
  { key: "inverseCase", label: "Đảo ngược chữ hoa/thường" }
];

export function TextCaseConverter() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<TextCaseResults | null>(null);
  const [hasConverted, setHasConverted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const stats = useMemo(() => getTextStats(input), [input]);

  const runConvert = useCallback((value: string) => {
    if (!value) {
      setResults(null);
      setHasConverted(true);
      return;
    }

    setResults(generateCaseResults(value));
    setHasConverted(true);
  }, []);

  const reportCopyError = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const handleConvert = () => {
    setStatusMessage(null);
    runConvert(input);
  };

  const handleCopyOriginal = useCallback(async () => {
    if (!input) {
      reportCopyError("Chưa có nội dung để sao chép.");
      return false;
    }

    const ok = await copyToClipboard(input);
    if (!ok) {
      reportCopyError("Không thể sao chép. Hãy thử chọn thủ công.");
    }
    return ok;
  }, [input, reportCopyError]);

  const handleClear = () => {
    setInput("");
    setResults(null);
    setHasConverted(false);
    setStatusMessage(null);
    textareaRef.current?.focus();
  };

  const handlePasteSample = () => {
    setInput(SAMPLE_TEXT);
    setStatusMessage(null);
    runConvert(SAMPLE_TEXT);
    textareaRef.current?.focus();
  };

  const handleExampleClick = (exampleInput: string) => {
    setInput(exampleInput);
    setStatusMessage(null);
    runConvert(exampleInput);
    textareaRef.current?.focus();
  };

  const handleCopyResult = useCallback(
    async (key: ResultKey) => {
      const text = results?.[key] ?? "";

      if (!text) {
        reportCopyError("Chưa có nội dung để sao chép.");
        return false;
      }

      const ok = await copyToClipboard(text);
      if (!ok) {
        reportCopyError("Không thể sao chép. Hãy thử chọn thủ công.");
      }
      return ok;
    },
    [results, reportCopyError]
  );

  const showEmptyResults = hasConverted && !input;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Chuyển Chữ Hoa / Thường</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Công cụ giúp chuyển đổi văn bản sang chữ hoa, chữ thường, viết hoa chữ cái đầu tiên, viết hoa
          mỗi từ và viết hoa đầu câu nhanh chóng.
        </p>
      </header>

      <div className="space-y-2">
        <label className="sr-only" htmlFor="text-case-input">
          Nhập văn bản cần chuyển đổi
        </label>
        <textarea
          className="min-h-[140px] w-full resize-y rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
          id="text-case-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Nhập hoặc dán văn bản cần chuyển đổi chữ hoa/thường vào đây..."
          ref={textareaRef}
          rows={6}
          value={input}
        />

        <p className="text-xs text-zinc-500">
          Ký tự: <span className="font-semibold text-zinc-300">{stats.characters}</span>
          <span className="mx-2 text-zinc-700">|</span>
          Từ: <span className="font-semibold text-zinc-300">{stats.words}</span>
          <span className="mx-2 text-zinc-700">|</span>
          Dòng: <span className="font-semibold text-zinc-300">{stats.lines}</span>
        </p>
      </div>

      <UtilityActionBar primary={{ label: "Chuyển đổi", onClick: handleConvert }}>
        <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
        <UtilityActionSecondaryButton label="Ví dụ" onClick={handlePasteSample} />
        <CopyButton
          className={utilityActionSecondaryClassName}
          label="Sao chép"
          onCopy={handleCopyOriginal}
        />
      </UtilityActionBar>

      {statusMessage ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
          {statusMessage}
        </p>
      ) : null}

      <section aria-labelledby="text-case-results" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="text-case-results">
          Kết quả
        </h2>

        {!hasConverted ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
            Nhập văn bản và bấm &ldquo;Chuyển đổi&rdquo; để xem kết quả.
          </p>
        ) : showEmptyResults ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
            Nhập văn bản để xem kết quả chuyển đổi.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {RESULT_CARDS.map((card, index) => {
              const text = results?.[card.key] ?? "";

              return (
                <article
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4"
                  key={card.key}
                >
                  <h3
                    className={`text-xs font-bold uppercase tracking-wide ${
                      index === 0 ? "text-cyan-300/90" : "text-zinc-400"
                    }`}
                  >
                    {card.label}
                  </h3>
                  <p className="min-h-[2.5rem] flex-1 whitespace-pre-wrap break-words text-sm text-zinc-100">
                    {text}
                  </p>
                  <CopyButton
                    className="self-start"
                    disabled={!text}
                    onCopy={() => handleCopyResult(card.key)}
                    variant="compact"
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="text-case-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="text-case-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={`${example.input}-${example.output}`}
              onClick={() => handleExampleClick(example.input)}
              type="button"
            >
              <span className="text-zinc-300">{example.input}</span>
              <span className="mx-2 text-zinc-600">→</span>
              <span className="text-cyan-100/90">{example.output}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
