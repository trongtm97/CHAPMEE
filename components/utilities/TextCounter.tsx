"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/utilities/CopyButton";
import { UtilityActionSecondaryButton, utilityActionPrimaryClassName } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  formatWordFrequencyForCopy,
  getTextStats,
  SAMPLE_TEXT,
  type WordFrequencyOptions
} from "@/lib/utilities/text-counter";

type StatCardProps = {
  label: string;
  value: string | number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-zinc-50 sm:text-2xl">{value}</p>
    </article>
  );
}

export function TextCounter() {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [skipShortWords, setSkipShortWords] = useState(true);
  const [ignoreCommonWords, setIgnoreCommonWords] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const frequencyOptions = useMemo<WordFrequencyOptions>(
    () => ({
      minWordLength: skipShortWords ? 2 : 1,
      ignoreCommonWords,
      maxResults: 20
    }),
    [skipShortWords, ignoreCommonWords]
  );

  const stats = useMemo(() => getTextStats(input, frequencyOptions), [input, frequencyOptions]);
  const isEmpty = input.length === 0;
  const hasFrequencyData = stats.wordFrequency.length > 0;

  const reportCopyError = useCallback((errorMessage: string) => {
    setMessage(errorMessage);
    window.setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!input.trim()) {
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
    setMessage(null);
    textareaRef.current?.focus();
  };

  const handlePasteSample = () => {
    setInput(SAMPLE_TEXT);
    setMessage(null);
    textareaRef.current?.focus();
  };

  const handleCopyFrequency = useCallback(async () => {
    if (!hasFrequencyData) {
      reportCopyError("Chưa có dữ liệu thống kê từ để sao chép.");
      return false;
    }

    const ok = await copyToClipboard(formatWordFrequencyForCopy(stats.wordFrequency));
    if (!ok) {
      reportCopyError("Không thể sao chép. Hãy thử chọn thủ công.");
    }
    return ok;
  }, [hasFrequencyData, stats.wordFrequency, reportCopyError]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Đếm Từ / Ký Tự</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Công cụ giúp đếm số từ, số ký tự, số câu, số dòng, thống kê tần suất từ và ước tính thời gian
          đọc nhanh chóng ngay trên trình duyệt.
        </p>
      </header>

      <div className="space-y-2">
        <label className="sr-only" htmlFor="text-counter-input">
          Nhập văn bản
        </label>
        <textarea
          ref={textareaRef}
          className="min-h-[180px] w-full resize-y rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
          id="text-counter-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Nhập hoặc dán văn bản của bạn vào đây..."
          value={input}
        />
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
        <UtilityActionSecondaryButton label="Ví dụ" onClick={handlePasteSample} />
        <CopyButton className={utilityActionPrimaryClassName} label="Sao chép" onCopy={handleCopy} />
      </div>

      {message ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
          {message}
        </p>
      ) : null}

      {isEmpty ? (
        <p className="text-sm text-zinc-500">Nhập hoặc dán văn bản để bắt đầu thống kê.</p>
      ) : null}

      <section aria-labelledby="text-counter-main-stats" className="space-y-3">
        <h2 className="sr-only" id="text-counter-main-stats">
          Thống kê chính
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          <StatCard label="Ký tự" value={stats.characters} />
          <StatCard label="Không tính khoảng trắng" value={stats.charactersWithoutSpaces} />
          <StatCard label="Từ" value={stats.words} />
          <StatCard label="Câu" value={stats.sentences} />
          <StatCard label="Dòng" value={stats.lines} />
          <StatCard label="Đoạn văn" value={stats.paragraphs} />
        </div>
      </section>

      <section aria-labelledby="text-counter-time-stats" className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400" id="text-counter-time-stats">
          Thời gian ước tính
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Thời gian đọc" value={stats.readingTime} />
          <StatCard label="Thời gian nói" value={stats.speakingTime} />
        </div>
      </section>

      <section
        aria-labelledby="text-counter-word-frequency"
        className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-sm font-bold text-zinc-200" id="text-counter-word-frequency">
            Thống kê tần suất từ
          </h2>
          <CopyButton
            disabled={!hasFrequencyData}
            label="Sao chép thống kê từ"
            onCopy={handleCopyFrequency}
            variant="compact"
          />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={skipShortWords}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              onChange={(event) => setSkipShortWords(event.target.checked)}
              type="checkbox"
            />
            Bỏ qua từ dưới 2 ký tự
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              checked={ignoreCommonWords}
              className="size-4 rounded border-white/20 bg-zinc-900 text-cyan-400 focus:ring-cyan-300/30"
              onChange={(event) => setIgnoreCommonWords(event.target.checked)}
              type="checkbox"
            />
            Bỏ qua từ phổ biến
          </label>
        </div>

        {hasFrequencyData ? (
          <>
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 pr-4 font-semibold">Từ</th>
                    <th className="pb-2 font-semibold">Số lần</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.wordFrequency.map((item) => (
                    <tr className="border-b border-white/5 last:border-0" key={item.word}>
                      <td className="py-2 pr-4 font-medium text-zinc-100">{item.word}</td>
                      <td className="py-2 tabular-nums text-zinc-300">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 sm:hidden">
              {stats.wordFrequency.map((item) => (
                <li
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-900/50 px-3 py-2 text-sm"
                  key={item.word}
                >
                  <span className="font-medium text-zinc-100">{item.word}</span>
                  <span className="tabular-nums text-zinc-400">{item.count} lần</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Chưa có dữ liệu tần suất từ.</p>
        )}
      </section>
    </div>
  );
}
