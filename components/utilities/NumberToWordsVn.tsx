"use client";

import { useCallback, useRef, useState } from "react";
import { CopyButton } from "@/components/utilities/CopyButton";
import { UtilityActionBar, UtilityActionSecondaryButton } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  generateMoneyToWordsResults,
  getMoneyToWordsErrorMessage,
  type MoneyToWordsResult
} from "@/lib/utilities/money-to-words-vn";

const SAMPLE_AMOUNT = "1234567";
const EMPTY_PLACEHOLDER = "—";

const EXAMPLES = [
  { input: "1000000", output: "Một triệu đồng" },
  { input: "1250000", output: "Một triệu hai trăm năm mươi nghìn đồng" },
  { input: "12345678", output: "Mười hai triệu ba trăm bốn mươi lăm nghìn sáu trăm bảy mươi tám đồng" },
  { input: "1500000000", output: "Một tỷ năm trăm triệu đồng" }
] as const;

type ResultKey = keyof MoneyToWordsResult;

const RESULT_ROWS: {
  key: ResultKey;
  label: string;
  highlighted?: boolean;
}[] = [
  { key: "capitalizeFirst", label: "Hoa đầu", highlighted: true },
  { key: "lower", label: "Thường" },
  { key: "upper", label: "IN HOA" }
];

export function NumberToWordsVn() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<MoneyToWordsResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [includeCurrency, setIncludeCurrency] = useState(true);
  const [includeEvenWord, setIncludeEvenWord] = useState(false);
  const [removeTones, setRemoveTones] = useState(false);

  const runConvert = useCallback(
    (value: string) => {
      const output = generateMoneyToWordsResults(value, {
        includeCurrency,
        includeEvenWord,
        removeTones
      });

      if ("error" in output) {
        setResults(null);
        setErrorMessage(getMoneyToWordsErrorMessage(output.error));
        return false;
      }

      setErrorMessage(null);
      setResults(output);
      return true;
    },
    [includeCurrency, includeEvenWord, removeTones]
  );

  const reportCopyError = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const handleConvert = () => {
    setStatusMessage(null);
    runConvert(input);
  };

  const handleClear = () => {
    setInput("");
    setResults(null);
    setErrorMessage(null);
    setStatusMessage(null);
    inputRef.current?.focus();
  };

  const handlePasteSample = () => {
    setInput(SAMPLE_AMOUNT);
    setStatusMessage(null);
    runConvert(SAMPLE_AMOUNT);
  };

  const handleExampleClick = (exampleInput: string) => {
    setInput(exampleInput);
    setStatusMessage(null);
    runConvert(exampleInput);
  };

  const handleCopy = useCallback(
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

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Chuyển Số Tiền Thành Chữ</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Nhập số tiền bằng chữ số để chuyển sang chữ tiếng Việt nhanh chóng, tiện dùng cho hợp đồng,
          hóa đơn, phiếu thu, phiếu chi và văn bản hành chính.
        </p>
      </header>

      <div className="space-y-2">
        <label className="sr-only" htmlFor="money-to-words-input">
          Nhập số tiền
        </label>
        <input
          className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
          id="money-to-words-input"
          inputMode="numeric"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Nhập số tiền, ví dụ: 1250000 hoặc 1.250.000"
          ref={inputRef}
          type="text"
          value={input}
        />

        <section
          aria-labelledby="money-to-words-results"
          className="rounded-2xl border border-white/10 bg-zinc-950/50 px-3 py-2"
        >
          <h2 className="sr-only" id="money-to-words-results">
            Kết quả chuyển đổi
          </h2>
          <ul className="divide-y divide-white/5">
            {RESULT_ROWS.map((row) => {
              const text = results?.[row.key];
              const display = text ?? EMPTY_PLACEHOLDER;

              return (
                <li className="flex items-center gap-2 py-2" key={row.key}>
                  <span
                    className={`w-14 shrink-0 text-[10px] font-bold uppercase tracking-wide ${
                      row.highlighted ? "text-cyan-300/80" : "text-zinc-500"
                    }`}
                  >
                    {row.label}
                  </span>
                  <p
                    className={`min-w-0 flex-1 truncate text-sm ${
                      text
                        ? row.highlighted
                          ? "font-medium text-cyan-50"
                          : "text-zinc-200"
                        : "text-zinc-600"
                    }`}
                    title={text ?? undefined}
                  >
                    {display}
                  </p>
                  <CopyButton
                    className="shrink-0 px-2.5 py-1 text-[11px]"
                    disabled={!text}
                    onCopy={() => handleCopy(row.key)}
                    variant="compact"
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {errorMessage ? (
          <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <UtilityActionBar primary={{ label: "Chuyển thành chữ", onClick: handleConvert }}>
        <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
        <UtilityActionSecondaryButton label="Ví dụ" onClick={handlePasteSample} />
      </UtilityActionBar>

      {statusMessage ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
          {statusMessage}
        </p>
      ) : null}

      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Tùy chọn
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={includeCurrency}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              onChange={(event) => setIncludeCurrency(event.target.checked)}
              type="checkbox"
            />
            Thêm đơn vị &ldquo;đồng&rdquo;
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={includeEvenWord}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              onChange={(event) => setIncludeEvenWord(event.target.checked)}
              type="checkbox"
            />
            Thêm chữ &ldquo;chẵn&rdquo;
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={removeTones}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              onChange={(event) => setRemoveTones(event.target.checked)}
              type="checkbox"
            />
            Xuất kết quả không dấu
          </label>
        </div>
      </fieldset>

      <section aria-labelledby="money-to-words-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="money-to-words-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={example.input}
              onClick={() => handleExampleClick(example.input)}
              type="button"
            >
              <span className="font-mono text-xs text-zinc-400">{formatExampleInput(example.input)}</span>
              <span className="mx-2 text-zinc-600">→</span>
              <span className="text-cyan-100/90">{example.output}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatExampleInput(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
