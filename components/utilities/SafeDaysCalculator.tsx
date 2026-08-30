"use client";

import { useCallback, useRef, useState } from "react";
import { UtilityActionBar, UtilityActionSecondaryButton } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  buildCalendarMonth,
  dateToInputValue,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  FERTILE_WINDOW_NOTE,
  formatDateRangeVN,
  formatDateVN,
  formatLowerFertilityText,
  formatSafeDaysResultForCopy,
  generateMultipleCyclePredictions,
  getMonthsForPredictions,
  MAIN_DISCLAIMER,
  MEDICAL_CONDITION_NOTE,
  OVULATION_NOTE,
  validateSafeDaysInput,
  type CyclePrediction,
  type CycleRegularity,
  type DayStatus,
  type PredictionCount,
  type SafeDaysInput
} from "@/lib/utilities/safe-days-utils";

const SAMPLE_DATE = "2026-06-01";
const SAMPLE_CYCLE = "28";
const SAMPLE_PERIOD = "5";

const QUICK_EXAMPLES = [
  { cycleLength: "28", label: "Chu kỳ 28 ngày", ovulation: "15/06/2026" },
  { cycleLength: "30", label: "Chu kỳ 30 ngày", ovulation: "17/06/2026" },
  { cycleLength: "26", label: "Chu kỳ 26 ngày", ovulation: "13/06/2026" }
] as const;

const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  period: "Ngày kinh",
  fertile: "Ngày dễ thụ thai",
  ovulation: "Ngày rụng trứng dự kiến",
  caution: "Ngày nên cẩn thận",
  lower_fertility: "Ngày ít khả năng thụ thai hơn",
  none: ""
};

const DAY_STATUS_COLORS: Record<DayStatus, string> = {
  period: "bg-red-400/25 text-red-100 ring-red-400/30",
  fertile: "bg-orange-400/25 text-orange-100 ring-orange-400/30",
  ovulation: "bg-violet-400/30 text-violet-100 ring-violet-400/40 font-bold",
  caution: "bg-amber-400/20 text-amber-100 ring-amber-400/25",
  lower_fertility: "bg-emerald-400/15 text-emerald-100/90 ring-emerald-400/20",
  none: "text-zinc-400"
};

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12"
];

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function SafeDaysCalculator() {
  const dateRef = useRef<HTMLInputElement>(null);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [cycleLength, setCycleLength] = useState(String(DEFAULT_CYCLE_LENGTH));
  const [periodLength, setPeriodLength] = useState(String(DEFAULT_PERIOD_LENGTH));
  const [regularity, setRegularity] = useState<CycleRegularity>("regular");
  const [predictionCount, setPredictionCount] = useState<PredictionCount>(3);
  const [input, setInput] = useState<SafeDaysInput | null>(null);
  const [predictions, setPredictions] = useState<CyclePrediction[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const primaryCycle = predictions[0] ?? null;

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const runCalculate = useCallback(
    (
      dateValue: string,
      cycleValue: string,
      periodValue: string,
      regularityValue: CycleRegularity,
      countValue: PredictionCount
    ) => {
      const validation = validateSafeDaysInput(
        dateValue,
        cycleValue,
        periodValue,
        regularityValue,
        countValue
      );

      if (!validation.isValid || !validation.input) {
        setInput(null);
        setPredictions([]);
        setWarnings([]);
        setErrorMessage(validation.error ?? "Vui lòng kiểm tra lại dữ liệu nhập.");
        return false;
      }

      setErrorMessage(null);
      setWarnings(validation.warnings);
      setInput(validation.input);
      setPredictions(generateMultipleCyclePredictions(validation.input));
      return true;
    },
    []
  );

  const handleCalculate = () => {
    setStatusMessage(null);
    runCalculate(lastPeriodDate, cycleLength, periodLength, regularity, predictionCount);
  };

  const handleClear = () => {
    setLastPeriodDate("");
    setCycleLength(String(DEFAULT_CYCLE_LENGTH));
    setPeriodLength(String(DEFAULT_PERIOD_LENGTH));
    setRegularity("regular");
    setPredictionCount(3);
    setInput(null);
    setPredictions([]);
    setWarnings([]);
    setErrorMessage(null);
    setStatusMessage(null);
    dateRef.current?.focus();
  };

  const handlePasteSample = () => {
    setLastPeriodDate(SAMPLE_DATE);
    setCycleLength(SAMPLE_CYCLE);
    setPeriodLength(SAMPLE_PERIOD);
    setRegularity("regular");
    setPredictionCount(3);
    setStatusMessage(null);
    runCalculate(SAMPLE_DATE, SAMPLE_CYCLE, SAMPLE_PERIOD, "regular", 3);
  };

  const handleExampleClick = (exampleCycle: string) => {
    const date = SAMPLE_DATE;
    setLastPeriodDate(date);
    setCycleLength(exampleCycle);
    setPeriodLength(SAMPLE_PERIOD);
    setRegularity("regular");
    setPredictionCount(3);
    setStatusMessage(null);
    runCalculate(date, exampleCycle, SAMPLE_PERIOD, "regular", 3);
  };

  const handleCopyResult = async () => {
    if (!input || !primaryCycle) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatSafeDaysResultForCopy(input, primaryCycle));
    if (ok) {
      reportStatus("Đã sao chép kết quả!");
      return;
    }

    reportStatus("Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const maxDate = dateToInputValue(new Date());
  const calendarMonths = primaryCycle ? getMonthsForPredictions(predictions) : [];

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Tính Ngày Quan Hệ An Toàn</h1>
        <p className="text-sm font-medium text-zinc-300">Ước tính ngày rụng trứng và ngày ít khả năng thụ thai</p>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Nhập ngày bắt đầu kỳ kinh gần nhất và độ dài chu kỳ để ước tính ngày rụng trứng, khoảng dễ thụ thai và
          những ngày ít khả năng thụ thai hơn.
        </p>
      </header>

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        Không có ngày nào an toàn tuyệt đối. Nếu chưa muốn mang thai, nên dùng biện pháp tránh thai phù hợp.
      </p>

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <section aria-labelledby="safe-days-inputs" className="space-y-4">
          <h2 className="sr-only" id="safe-days-inputs">
            Nhập liệu
          </h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="safe-days-date">
                Ngày bắt đầu kỳ kinh gần nhất
              </label>
              <input
                className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                id="safe-days-date"
                max={maxDate}
                onChange={(event) => setLastPeriodDate(event.target.value)}
                placeholder="Chọn ngày, ví dụ: 01/06/2026"
                ref={dateRef}
                type="date"
                value={lastPeriodDate}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="safe-days-cycle">
                Độ dài chu kỳ
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                  id="safe-days-cycle"
                  inputMode="numeric"
                  onChange={(event) => setCycleLength(event.target.value)}
                  placeholder="Ví dụ: 28"
                  type="text"
                  value={cycleLength}
                />
                <span className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium text-zinc-300">
                  ngày
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Độ dài chu kỳ được tính từ ngày đầu tiên của kỳ kinh này đến ngày đầu tiên của kỳ kinh tiếp theo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="safe-days-period">
                Số ngày hành kinh
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                  id="safe-days-period"
                  inputMode="numeric"
                  onChange={(event) => setPeriodLength(event.target.value)}
                  placeholder="Ví dụ: 5"
                  type="text"
                  value={periodLength}
                />
                <span className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium text-zinc-300">
                  ngày
                </span>
              </div>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium text-zinc-200">Chu kỳ của bạn có đều không?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    { value: "regular", label: "Đều" },
                    { value: "irregular", label: "Không đều" },
                    { value: "unknown", label: "Không chắc" }
                  ] as const
                ).map((option) => (
                  <label
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition ${
                      regularity === option.value
                        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-white/20"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={regularity === option.value}
                      className="sr-only"
                      name="regularity"
                      onChange={() => setRegularity(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {regularity !== "regular" ? (
                <p className="mt-2 text-xs text-amber-200/90">
                  Nếu chu kỳ không đều, việc tính ngày rụng trứng bằng lịch chỉ mang tính tham khảo và có thể sai
                  lệch nhiều ngày.
                </p>
              ) : null}
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="safe-days-prediction">
                Dự đoán nhiều chu kỳ
              </label>
              <select
                className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                id="safe-days-prediction"
                onChange={(event) => setPredictionCount(Number(event.target.value) as PredictionCount)}
                value={predictionCount}
              >
                <option value={1}>1 chu kỳ</option>
                <option value={3}>3 chu kỳ</option>
                <option value={6}>6 chu kỳ</option>
              </select>
            </div>
          </div>

          {errorMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.map((warning) => (
                <p className="text-xs leading-relaxed text-amber-200/90" key={warning}>
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <UtilityActionBar primary={{ label: "Tính ngày", onClick: handleCalculate }}>
            <UtilityActionSecondaryButton label="Xóa" onClick={handleClear} />
            <UtilityActionSecondaryButton label="Ví dụ" onClick={handlePasteSample} />
            <UtilityActionSecondaryButton label="Sao chép" onClick={() => void handleCopyResult()} />
          </UtilityActionBar>

          {statusMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-cyan-200" role="status">
              {statusMessage}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="safe-days-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="safe-days-results">
            Kết quả
          </h2>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
            {primaryCycle && input ? (
              <div className="space-y-4">
                <ResultCard
                  label="Ngày dự kiến rụng trứng"
                  note={OVULATION_NOTE}
                  value={formatDateVN(primaryCycle.ovulationDate)}
                />
                <ResultCard
                  label="Khoảng dễ thụ thai"
                  note={FERTILE_WINDOW_NOTE}
                  value={formatDateRangeVN(primaryCycle.fertileWindow)}
                />
                <ResultCard
                  label="Khoảng nên tránh quan hệ không bảo vệ nếu chưa muốn mang thai"
                  value={formatDateRangeVN(primaryCycle.cautionWindow)}
                />
                <ResultCard
                  label="Ngày dự kiến kỳ kinh tiếp theo"
                  value={formatDateVN(primaryCycle.nextPeriodDate)}
                />
                <ResultCard
                  label="Ngày ít khả năng thụ thai hơn"
                  value={formatLowerFertilityText(primaryCycle.cautionWindow)}
                />
                {primaryCycle.note ? (
                  <p className="text-xs leading-relaxed text-amber-200/90">{primaryCycle.note}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Nhập thông tin chu kỳ, sau đó bấm &ldquo;Tính ngày&rdquo; để xem kết quả ước tính.
              </p>
            )}
          </div>
        </section>
      </div>

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="font-semibold">Lưu ý:</strong> {MAIN_DISCLAIMER.replace(/^Lưu ý:\s*/, "")}
      </p>

      <p className="text-xs leading-relaxed text-zinc-500">{MEDICAL_CONDITION_NOTE}</p>

      {primaryCycle && input ? (
        <>
          <section aria-labelledby="safe-days-calendar-list" className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-200" id="safe-days-calendar-list">
              Lịch minh họa
            </h2>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-sm text-zinc-300 sm:p-5">
              <ul className="space-y-2">
                <li>
                  <span className="text-zinc-500">Ngày kinh:</span>{" "}
                  {formatDateRangeVN(primaryCycle.periodRange)}
                </li>
                <li>
                  <span className="text-zinc-500">Ngày nên cẩn thận:</span>{" "}
                  {formatDateRangeVN(primaryCycle.cautionWindow)}
                </li>
                <li>
                  <span className="text-zinc-500">Ngày rụng trứng dự kiến:</span>{" "}
                  {formatDateVN(primaryCycle.ovulationDate)}
                </li>
                <li>
                  <span className="text-zinc-500">Ngày kỳ kinh tiếp theo:</span>{" "}
                  {formatDateVN(primaryCycle.nextPeriodDate)}
                </li>
              </ul>
            </div>

            <CalendarLegend />

            <div className="grid gap-4 lg:grid-cols-2">
              {calendarMonths.map(({ year, month }) => (
                <MonthCalendar
                  key={`${year}-${month}`}
                  month={month}
                  predictions={predictions}
                  year={year}
                />
              ))}
            </div>
          </section>

          {predictions.length > 1 ? (
            <section aria-labelledby="safe-days-multi-cycle" className="space-y-3">
              <h2 className="text-sm font-bold text-zinc-200" id="safe-days-multi-cycle">
                Dự đoán nhiều chu kỳ
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-3 font-semibold">Chu kỳ</th>
                      <th className="px-4 py-3 font-semibold">Kỳ kinh dự kiến</th>
                      <th className="px-4 py-3 font-semibold">Rụng trứng dự kiến</th>
                      <th className="px-4 py-3 font-semibold">Khoảng dễ thụ thai</th>
                      <th className="px-4 py-3 font-semibold">Kỳ kinh tiếp theo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((cycle) => (
                      <tr className="border-b border-white/5 last:border-0" key={cycle.cycleIndex}>
                        <td className="px-4 py-3 font-medium text-zinc-200">Chu kỳ {cycle.cycleIndex}</td>
                        <td className="px-4 py-3 text-zinc-300">{formatDateRangeVN(cycle.periodRange)}</td>
                        <td className="px-4 py-3 text-zinc-300">{formatDateVN(cycle.ovulationDate)}</td>
                        <td className="px-4 py-3 text-zinc-300">{formatDateRangeVN(cycle.fertileWindow)}</td>
                        <td className="px-4 py-3 text-zinc-300">{formatDateVN(cycle.nextPeriodDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section aria-labelledby="safe-days-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="safe-days-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={example.cycleLength}
              onClick={() => handleExampleClick(example.cycleLength)}
              type="button"
            >
              <span className="block font-medium text-zinc-200">{example.label}</span>
              <span className="mt-1 block text-xs text-zinc-400">
                Kỳ kinh bắt đầu 01/06/2026 → rụng trứng khoảng {example.ovulation}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="safe-days-guide" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="safe-days-guide">
          Cách sử dụng công cụ
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>Chọn ngày đầu tiên của kỳ kinh gần nhất.</li>
          <li>Nhập độ dài chu kỳ kinh nguyệt trung bình của bạn.</li>
          <li>Nhập số ngày hành kinh nếu muốn đánh dấu ngày kinh trên lịch.</li>
          <li>
            Bấm &ldquo;Tính ngày&rdquo; để xem ngày rụng trứng dự kiến, khoảng dễ thụ thai và các ngày ít khả năng
            thụ thai hơn.
          </li>
        </ol>
        <p className="text-xs leading-relaxed text-zinc-500">
          Lưu ý: Kết quả chỉ là ước tính. Nếu chưa muốn mang thai, không nên chỉ dựa vào cách tính ngày. Bao cao su
          giúp giảm nguy cơ mang thai ngoài ý muốn và bệnh lây qua đường tình dục.
        </p>
      </section>
    </div>
  );
}

function ResultCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="space-y-1 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-base font-semibold text-zinc-100">{value}</p>
      {note ? <p className="text-xs leading-relaxed text-zinc-500">{note}</p> : null}
    </div>
  );
}

function CalendarLegend() {
  const items: DayStatus[] = ["period", "fertile", "ovulation", "caution", "lower_fertility"];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((status) => (
        <span
          className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${DAY_STATUS_COLORS[status]}`}
          key={status}
        >
          {DAY_STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}

function MonthCalendar({
  year,
  month,
  predictions
}: {
  year: number;
  month: number;
  predictions: CyclePrediction[];
}) {
  const calendar = buildCalendarMonth(year, month, predictions);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
      <p className="mb-3 text-sm font-semibold text-zinc-200">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500">
        {WEEKDAY_LABELS.map((label) => (
          <div className="py-1 font-medium" key={label}>
            {label}
          </div>
        ))}
        {calendar.days.map((day) => (
          <div
            className={`flex aspect-square items-center justify-center rounded-lg text-[11px] ring-1 ring-inset ${
              day.inMonth ? DAY_STATUS_COLORS[day.status] : "text-zinc-600 opacity-40"
            } ${day.status === "none" && day.inMonth ? "ring-transparent" : ""}`}
            key={day.date.toISOString()}
            title={day.status !== "none" ? DAY_STATUS_LABELS[day.status] : undefined}
          >
            {day.date.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}
