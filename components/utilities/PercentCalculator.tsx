"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import { UtilityActionBar, UtilityActionSecondaryButton } from "@/components/utilities/UtilityActionBar";
import { UtilityModeSelector } from "@/components/utilities/UtilityModeSelector";
import {
  calculateByMode,
  formatNumberVN,
  formatPercentageResultForCopy,
  PERCENTAGE_MODE_FORMULAS,
  PERCENTAGE_MODE_LABELS,
  PERCENTAGE_MODE_QUESTIONS,
  validatePercentageInput,
  type ChangeType,
  type PercentageMode,
  type PercentageResult
} from "@/lib/utilities/percent-calculator";

const MODES: PercentageMode[] = [
  "percent_of_number",
  "number_is_what_percent",
  "increase_decrease",
  "percent_change",
  "discount_price",
  "original_price"
];

type FormState = Record<string, string>;

const INITIAL_FORMS: Record<PercentageMode, FormState> = {
  percent_of_number: { percent: "", value: "" },
  number_is_what_percent: { part: "", total: "" },
  increase_decrease: { originalValue: "", percent: "", changeType: "decrease" },
  percent_change: { oldValue: "", newValue: "" },
  discount_price: { originalPrice: "", discountPercent: "" },
  original_price: { finalPrice: "", discountPercent: "" }
};

const SAMPLE_DATA: Record<PercentageMode, FormState> = {
  percent_of_number: { percent: "10", value: "1.000.000" },
  number_is_what_percent: { part: "200", total: "1.000" },
  increase_decrease: { originalValue: "500.000", percent: "20", changeType: "decrease" },
  percent_change: { oldValue: "100", newValue: "150" },
  discount_price: { originalPrice: "1.000.000", discountPercent: "30" },
  original_price: { finalPrice: "700.000", discountPercent: "30" }
};

type QuickExample = {
  mode: PercentageMode;
  form: FormState;
  label: string;
};

const QUICK_EXAMPLES: QuickExample[] = [
  {
    mode: "percent_of_number",
    form: { percent: "10", value: "1.000.000" },
    label: "10% của 1.000.000 = 100.000"
  },
  {
    mode: "number_is_what_percent",
    form: { part: "200", total: "1.000" },
    label: "200 là 20% của 1.000"
  },
  {
    mode: "increase_decrease",
    form: { originalValue: "500.000", percent: "20", changeType: "decrease" },
    label: "500.000 giảm 20% = 400.000"
  },
  {
    mode: "percent_change",
    form: { oldValue: "100", newValue: "150" },
    label: "100 tăng lên 150 = tăng 50%"
  },
  {
    mode: "discount_price",
    form: { originalPrice: "1.000.000", discountPercent: "30" },
    label: "1.000.000 giảm 30% = 700.000"
  },
  {
    mode: "original_price",
    form: { finalPrice: "700.000", discountPercent: "30" },
    label: "700.000 là giá sau giảm 30% → giá gốc 1.000.000"
  }
];

const inputClassName =
  "w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

const MODE_OPTIONS = MODES.map((tabMode) => ({
  value: tabMode,
  label: PERCENTAGE_MODE_LABELS[tabMode]
}));

function formatSecondaryValue(mode: PercentageMode, result: PercentageResult): string {
  if (result.secondaryValue === undefined) return "";
  if (mode === "percent_change" && result.secondaryLabel === "Chênh lệch") {
    return formatNumberVN(result.secondaryValue);
  }
  return formatNumberVN(result.secondaryValue);
}

export function PercentCalculator() {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<PercentageMode>("percent_of_number");
  const [forms, setForms] = useState(INITIAL_FORMS);
  const [result, setResult] = useState<PercentageResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  const currentForm = forms[mode];

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const runCalculate = useCallback(
    (calcMode: PercentageMode, form: FormState, showError: boolean) => {
      const hasEmptyFields = Object.entries(form).some(
        ([key, value]) => key !== "changeType" && !String(value).trim()
      );

      if (hasEmptyFields) {
        setResult(null);
        if (showError) {
          setErrorMessage("Vui lòng nhập số hợp lệ.");
        } else {
          setErrorMessage(null);
        }
        return false;
      }

      const validation = validatePercentageInput(calcMode, form);

      if (!validation.isValid) {
        setResult(null);
        if (showError) {
          setErrorMessage(validation.error ?? "Vui lòng nhập số hợp lệ.");
        } else {
          setErrorMessage(null);
        }
        return false;
      }

      setErrorMessage(null);
      setResult(calculateByMode(calcMode, form));
      return true;
    },
    []
  );

  useEffect(() => {
    if (!showValidationError) {
      runCalculate(mode, currentForm, false);
    }
  }, [mode, currentForm, runCalculate, showValidationError]);

  const updateField = (field: string, value: string) => {
    setShowValidationError(false);
    setForms((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [field]: value }
    }));
  };

  const handleModeChange = (newMode: PercentageMode) => {
    setMode(newMode);
    setResult(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setShowValidationError(false);
  };

  const handleCalculate = () => {
    setStatusMessage(null);
    setShowValidationError(true);
    runCalculate(mode, currentForm, true);
  };

  const handleClear = () => {
    setForms((prev) => ({
      ...prev,
      [mode]: { ...INITIAL_FORMS[mode] }
    }));
    setResult(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setShowValidationError(false);
    firstInputRef.current?.focus();
  };

  const handlePasteSample = () => {
    const sample = SAMPLE_DATA[mode];
    setForms((prev) => ({ ...prev, [mode]: { ...sample } }));
    setStatusMessage(null);
    setShowValidationError(false);
    runCalculate(mode, sample, false);
  };

  const applyQuickExample = (example: QuickExample) => {
    setMode(example.mode);
    setForms((prev) => ({ ...prev, [example.mode]: { ...example.form } }));
    setStatusMessage(null);
    setShowValidationError(false);
    runCalculate(example.mode, example.form, false);
  };

  const handleCopyResult = async () => {
    if (!result) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatPercentageResultForCopy(mode, result));
    if (ok) {
      reportStatus("Đã sao chép kết quả!");
      return;
    }

    reportStatus("Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const handleCopyLine = async (text: string, successMessage: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      reportStatus(successMessage);
      return;
    }

    reportStatus("Không thể sao chép. Hãy thử chọn thủ công.");
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Tính Phần Trăm</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Công cụ giúp tính phần trăm nhanh chóng: tính % của một số, tính tỷ lệ %, tăng giảm phần trăm, phần trăm
          thay đổi, giá sau giảm giá và giá gốc trước giảm giá.
        </p>
      </header>

      <UtilityModeSelector
        ariaLabel="Chọn dạng tính phần trăm"
        onChange={handleModeChange}
        options={MODE_OPTIONS}
        value={mode}
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="pct-inputs" className="space-y-4">
          <h2 className="sr-only" id="pct-inputs">
            Nhập liệu
          </h2>

          <p className="text-sm font-medium text-zinc-300">{PERCENTAGE_MODE_QUESTIONS[mode]}</p>

          <div className="space-y-3">
            {mode === "percent_of_number" ? (
              <>
                <FormField
                  id="pct-percent"
                  inputRef={firstInputRef}
                  label="Phần trăm (%)"
                  onChange={(value) => updateField("percent", value)}
                  placeholder="Phần trăm, ví dụ: 10"
                  value={currentForm.percent}
                />
                <FormField
                  id="pct-value"
                  label="Giá trị"
                  onChange={(value) => updateField("value", value)}
                  placeholder="Giá trị, ví dụ: 1000000"
                  value={currentForm.value}
                />
              </>
            ) : null}

            {mode === "number_is_what_percent" ? (
              <>
                <FormField
                  id="pct-part"
                  inputRef={firstInputRef}
                  label="Giá trị A"
                  onChange={(value) => updateField("part", value)}
                  placeholder="Giá trị A, ví dụ: 200"
                  value={currentForm.part}
                />
                <FormField
                  id="pct-total"
                  label="Giá trị B"
                  onChange={(value) => updateField("total", value)}
                  placeholder="Giá trị B, ví dụ: 1000"
                  value={currentForm.total}
                />
              </>
            ) : null}

            {mode === "increase_decrease" ? (
              <>
                <FormField
                  id="pct-original"
                  inputRef={firstInputRef}
                  label="Giá trị ban đầu"
                  onChange={(value) => updateField("originalValue", value)}
                  placeholder="Ví dụ: 500.000"
                  value={currentForm.originalValue}
                />
                <FormField
                  id="pct-change-percent"
                  label="Phần trăm thay đổi"
                  onChange={(value) => updateField("percent", value)}
                  placeholder="Ví dụ: 20"
                  value={currentForm.percent}
                />
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-zinc-200">Loại thay đổi</legend>
                  <div className="flex flex-wrap gap-2">
                    {(["increase", "decrease"] as ChangeType[]).map((type) => (
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                          currentForm.changeType === type
                            ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                            : "border-white/10 bg-zinc-950/50 text-zinc-200 hover:border-white/20"
                        }`}
                        key={type}
                      >
                        <input
                          checked={currentForm.changeType === type}
                          className="accent-cyan-300"
                          name="change-type"
                          onChange={() => updateField("changeType", type)}
                          type="radio"
                        />
                        {type === "increase" ? "Tăng" : "Giảm"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : null}

            {mode === "percent_change" ? (
              <>
                <FormField
                  id="pct-old"
                  inputRef={firstInputRef}
                  label="Giá trị cũ"
                  onChange={(value) => updateField("oldValue", value)}
                  placeholder="Ví dụ: 100"
                  value={currentForm.oldValue}
                />
                <FormField
                  id="pct-new"
                  label="Giá trị mới"
                  onChange={(value) => updateField("newValue", value)}
                  placeholder="Ví dụ: 150"
                  value={currentForm.newValue}
                />
              </>
            ) : null}

            {mode === "discount_price" ? (
              <>
                <FormField
                  id="pct-original-price"
                  inputRef={firstInputRef}
                  label="Giá gốc"
                  onChange={(value) => updateField("originalPrice", value)}
                  placeholder="Ví dụ: 1.000.000"
                  value={currentForm.originalPrice}
                />
                <FormField
                  id="pct-discount"
                  label="Phần trăm giảm giá"
                  onChange={(value) => updateField("discountPercent", value)}
                  placeholder="Ví dụ: 30"
                  value={currentForm.discountPercent}
                />
              </>
            ) : null}

            {mode === "original_price" ? (
              <>
                <FormField
                  id="pct-final-price"
                  inputRef={firstInputRef}
                  label="Giá sau giảm"
                  onChange={(value) => updateField("finalPrice", value)}
                  placeholder="Ví dụ: 700.000"
                  value={currentForm.finalPrice}
                />
                <FormField
                  id="pct-discount-original"
                  label="Phần trăm giảm giá"
                  onChange={(value) => updateField("discountPercent", value)}
                  placeholder="Ví dụ: 30"
                  value={currentForm.discountPercent}
                />
              </>
            ) : null}
          </div>

          {errorMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <UtilityActionBar primary={{ label: "Tính", onClick: handleCalculate }}>
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

        <section aria-labelledby="pct-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="pct-results">
            Kết quả
          </h2>

          {result ? (
            <div className="space-y-3">
              <ResultCard
                label={result.mainLabel}
                onCopy={() =>
                  handleCopyLine(
                    result.label,
                    mode === "percent_change"
                      ? "Đã sao chép mức thay đổi!"
                      : `Đã sao chép ${result.mainLabel.toLowerCase()}!`
                  )
                }
                value={result.label}
              />

              {result.secondaryLabel && result.secondaryValue !== undefined ? (
                <ResultCard
                  label={result.secondaryLabel}
                  onCopy={() =>
                    handleCopyLine(
                      formatSecondaryValue(mode, result),
                      `Đã sao chép ${result.secondaryLabel!.toLowerCase()}!`
                    )
                  }
                  value={formatSecondaryValue(mode, result)}
                />
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Diễn giải</p>
                <p className="mt-1 font-medium text-zinc-200">{result.description}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">
                Nhập các giá trị và bấm &ldquo;Tính&rdquo; để xem kết quả.
              </p>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="pct-formula" className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <h2 className="text-sm font-bold text-zinc-200" id="pct-formula">
          Hướng dẫn công thức
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
          {PERCENTAGE_MODE_FORMULAS[mode].map((formula) => (
            <li key={formula}>{formula}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pct-usage" className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <h2 className="text-sm font-bold text-zinc-200" id="pct-usage">
          Cách sử dụng công cụ tính phần trăm
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>Chọn dạng tính phần trăm bạn cần.</li>
          <li>Nhập các giá trị vào ô tương ứng.</li>
          <li>Bấm &ldquo;Tính&rdquo; để xem kết quả.</li>
          <li>Có thể bấm &ldquo;Sao chép kết quả&rdquo; để dùng trong báo giá, ghi chú hoặc nội dung bán hàng.</li>
        </ol>
        <p className="text-sm text-zinc-500">
          <strong className="font-semibold text-zinc-400">Ví dụ:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
          <li>Muốn biết 10% của 1.000.000, chọn &ldquo;Tính % của một số&rdquo;.</li>
          <li>Muốn biết 200 là bao nhiêu % của 1.000, chọn &ldquo;Tính tỷ lệ %&rdquo;.</li>
          <li>Muốn tính giá sau khi giảm 30%, chọn &ldquo;Giá sau giảm giá&rdquo;.</li>
          <li>Muốn biết từ 100 lên 150 tăng bao nhiêu %, chọn &ldquo;Phần trăm thay đổi&rdquo;.</li>
        </ul>
      </section>

      <section aria-labelledby="pct-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="pct-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm leading-relaxed text-zinc-300 transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={example.label}
              onClick={() => applyQuickExample(example)}
              type="button"
            >
              {example.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function FormField({
  id,
  label,
  placeholder,
  value,
  onChange,
  inputRef
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-200" htmlFor={id}>
        {label}
      </label>
      <input
        className={inputClassName}
        id={id}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        type="text"
        value={value}
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  onCopy
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-cyan-100">{value}</p>
      <button
        className="mt-3 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/25 hover:text-cyan-100"
        onClick={onCopy}
        type="button"
      >
        Sao chép
      </button>
    </div>
  );
}
