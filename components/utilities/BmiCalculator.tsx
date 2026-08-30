"use client";

import { useCallback, useRef, useState } from "react";
import { UtilityActionBar, UtilityActionSecondaryButton } from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  BMI_LEVEL_COLORS,
  BMI_SCALE_SEGMENTS,
  computeBMIResult,
  formatBMIResultForCopy,
  formatHealthyWeightRange,
  formatWeightKg,
  getBmiScalePosition,
  getBmiScaleSegmentId,
  getBmiScaleSegmentWidth,
  validateBMIInput,
  type BmiLevel,
  type BmiResult,
  type BmiScaleSegmentId
} from "@/lib/utilities/bmi-calculator";

const SAMPLE_WEIGHT = "70";
const SAMPLE_HEIGHT = "170";

const QUICK_EXAMPLES = [
  { weight: "50", height: "165", bmi: "18.37", category: "Thiếu cân" },
  { weight: "60", height: "165", bmi: "22.04", category: "Bình thường" },
  { weight: "75", height: "165", bmi: "27.55", category: "Thừa cân" },
  { weight: "90", height: "165", bmi: "33.06", category: "Béo phì độ I" }
] as const;

export function BmiCalculator() {
  const weightRef = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState<BmiResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const runCalculate = useCallback((weightValue: string, heightValue: string) => {
    const validation = validateBMIInput(weightValue, heightValue);

    if (!validation.isValid || validation.weightKg === undefined || validation.heightCm === undefined) {
      setResult(null);
      setErrorMessage(validation.error ?? "Vui lòng nhập cân nặng và chiều cao.");
      return false;
    }

    setErrorMessage(null);
    setResult(computeBMIResult(validation.weightKg, validation.heightCm));
    return true;
  }, []);

  const handleCalculate = () => {
    setStatusMessage(null);
    runCalculate(weight, height);
  };

  const handleClear = () => {
    setWeight("");
    setHeight("");
    setResult(null);
    setErrorMessage(null);
    setStatusMessage(null);
    weightRef.current?.focus();
  };

  const handlePasteSample = () => {
    setWeight(SAMPLE_WEIGHT);
    setHeight(SAMPLE_HEIGHT);
    setStatusMessage(null);
    runCalculate(SAMPLE_WEIGHT, SAMPLE_HEIGHT);
  };

  const handleExampleClick = (exampleWeight: string, exampleHeight: string) => {
    setWeight(exampleWeight);
    setHeight(exampleHeight);
    setStatusMessage(null);
    runCalculate(exampleWeight, exampleHeight);
  };

  const handleCopyResult = async () => {
    if (!result) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatBMIResultForCopy(result));
    if (ok) {
      reportStatus("Đã sao chép kết quả BMI!");
      return;
    }

    reportStatus("Không thể sao chép. Hãy thử chọn thủ công.");
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Tính BMI — Chỉ Số Khối Cơ Thể</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Nhập cân nặng và chiều cao để tính chỉ số BMI, xem phân loại cơ thể và khoảng cân nặng tham khảo.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="bmi-inputs" className="space-y-4">
          <h2 className="sr-only" id="bmi-inputs">
            Nhập liệu
          </h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="bmi-weight">
                Cân nặng
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                  id="bmi-weight"
                  inputMode="decimal"
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder="Nhập cân nặng, ví dụ: 70"
                  ref={weightRef}
                  type="text"
                  value={weight}
                />
                <span className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium text-zinc-300">
                  kg
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="bmi-height">
                Chiều cao
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                  id="bmi-height"
                  inputMode="decimal"
                  onChange={(event) => setHeight(event.target.value)}
                  placeholder="Nhập chiều cao, ví dụ: 170"
                  type="text"
                  value={height}
                />
                <span className="shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm font-medium text-zinc-300">
                  cm
                </span>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <UtilityActionBar primary={{ label: "Tính BMI", onClick: handleCalculate }}>
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

        <section aria-labelledby="bmi-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="bmi-results">
            Kết quả
          </h2>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
            {result ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Chỉ số BMI</p>
                  <p className={`text-3xl font-bold ${BMI_LEVEL_COLORS[result.level]}`}>{result.bmiFormatted}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Phân loại</p>
                  <p className={`text-lg font-semibold ${BMI_LEVEL_COLORS[result.level]}`}>{result.category}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Khoảng cân nặng tham khảo
                  </p>
                  <p className="text-sm text-zinc-200">
                    {formatWeightKg(result.healthyWeightRange.min)} kg — {formatWeightKg(result.healthyWeightRange.max)}{" "}
                    kg
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatHealthyWeightRange(result.heightCm, result.healthyWeightRange)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Gợi ý</p>
                  <p className="text-sm leading-relaxed text-zinc-300">{result.message}</p>
                </div>

                <BmiScaleBar bmi={result.bmi} level={result.level} />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Nhập cân nặng và chiều cao, sau đó bấm &ldquo;Tính BMI&rdquo; để xem kết quả.
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-zinc-500">
            Khoảng cân nặng tham khảo chỉ mang tính tham khảo, không thay thế tư vấn y tế.
          </p>
        </section>
      </div>

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="font-semibold">Lưu ý:</strong> BMI chỉ là chỉ số tham khảo, không thay thế chẩn đoán hoặc
        tư vấn y tế. Chỉ số này không phản ánh đầy đủ tỷ lệ cơ, mỡ, tuổi, giới tính, thai kỳ hoặc tình trạng sức khỏe
        cá nhân.
      </p>

      <section aria-labelledby="bmi-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="bmi-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={`${example.weight}-${example.height}`}
              onClick={() => handleExampleClick(example.weight, example.height)}
              type="button"
            >
              <span className="font-mono text-xs text-zinc-400">
                {example.weight} kg, {example.height} cm
              </span>
              <span className="mx-2 text-zinc-600">→</span>
              <span className="text-zinc-300">BMI {example.bmi}</span>
              <span className="mx-2 text-zinc-600">→</span>
              <span className="text-cyan-100/90">{example.category}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BmiScaleBar({ bmi, level }: { bmi: number; level: BmiLevel }) {
  const position = getBmiScalePosition(bmi);
  const activeSegment = getBmiScaleSegmentId(level);

  const segmentStyles: Record<BmiScaleSegmentId, string> = {
    underweight: "bg-sky-500/70",
    normal: "bg-emerald-500/70",
    overweight: "bg-amber-500/70",
    obese: "bg-orange-500/70"
  };

  const labels: { id: BmiScaleSegmentId; text: string }[] = [
    { id: "underweight", text: "Thiếu cân" },
    { id: "normal", text: "Bình thường" },
    { id: "overweight", text: "Thừa cân" },
    { id: "obese", text: "Béo phì" }
  ];

  return (
    <div aria-hidden="true" className="space-y-2 pt-1">
      <div className="relative h-2 overflow-visible rounded-full">
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          {BMI_SCALE_SEGMENTS.map((segment) => (
            <div
              className={`h-full ${segmentStyles[segment.id]}`}
              key={segment.id}
              style={{ width: `${getBmiScaleSegmentWidth(segment.from, segment.to)}%` }}
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-white shadow"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500">
        {labels.map((label) => (
          <span
            className={label.id === activeSegment ? BMI_LEVEL_COLORS[level] : undefined}
            key={label.id}
          >
            {label.text}
          </span>
        ))}
      </div>
    </div>
  );
}
