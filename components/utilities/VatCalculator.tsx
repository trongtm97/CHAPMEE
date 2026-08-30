"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UtilityActionBar,
  UtilityActionSecondaryButton
} from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  calculateVAT,
  formatCurrencyVND,
  formatVATResultForCopy,
  formatVatRate,
  validateVATInput,
  VAT_AMOUNT_LABELS,
  VAT_MODE_LABELS,
  VAT_RATE_PRESETS,
  type VATCalculationMode,
  type VATResult,
  type VatRatePreset
} from "@/lib/utilities/vat-calculator";

const FORWARD_SAMPLE_AMOUNT = "10.000.000";
const REVERSE_SAMPLE_AMOUNT = "11.000.000";
const DEFAULT_RATE = "10";

const inputClassName =
  "w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

const rateButtonClassName = (active: boolean) =>
  `rounded-xl border px-3 py-2 text-sm font-semibold transition ${
    active
      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
      : "border-white/10 bg-zinc-900/80 text-zinc-200 hover:border-white/20"
  }`;

type QuickExample = {
  mode: VATCalculationMode;
  amount: string;
  rate: string;
  label: string;
};

const QUICK_EXAMPLES: QuickExample[] = [
  {
    mode: "forward",
    amount: "10.000.000",
    rate: "10",
    label: "Tính xuôi VAT 10%: 10.000.000đ chưa VAT → VAT 1.000.000đ → Sau VAT 11.000.000đ"
  },
  {
    mode: "reverse",
    amount: "11.000.000",
    rate: "10",
    label: "Tính ngược VAT 10%: 11.000.000đ đã VAT → Trước VAT 10.000.000đ → VAT 1.000.000đ"
  },
  {
    mode: "forward",
    amount: "10.000.000",
    rate: "8",
    label: "Tính xuôi VAT 8%: 10.000.000đ chưa VAT → VAT 800.000đ → Sau VAT 10.800.000đ"
  },
  {
    mode: "reverse",
    amount: "10.800.000",
    rate: "8",
    label: "Tính ngược VAT 8%: 10.800.000đ đã VAT → Trước VAT 10.000.000đ → VAT 800.000đ"
  }
];

function resolveRatePreset(rate: string): VatRatePreset {
  const numeric = Number(rate);
  if (VAT_RATE_PRESETS.includes(numeric as (typeof VAT_RATE_PRESETS)[number])) {
    return numeric as VatRatePreset;
  }
  return "custom";
}

function getEffectiveRateString(ratePreset: VatRatePreset, customRate: string): string {
  if (ratePreset === "custom") return customRate;
  return String(ratePreset);
}

export function VatCalculator() {
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<VATCalculationMode>("forward");
  const [ratePreset, setRatePreset] = useState<VatRatePreset>(10);
  const [customRate, setCustomRate] = useState("");
  const [result, setResult] = useState<VATResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  const effectiveRate = getEffectiveRateString(ratePreset, customRate);

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const runCalculate = useCallback(
    (amountValue: string, rateValue: string, calcMode: VATCalculationMode, showError: boolean) => {
      const trimmedAmount = amountValue.trim();
      const trimmedRate = rateValue.trim();

      if (!trimmedAmount || !trimmedRate) {
        setResult(null);
        if (showError) {
          if (!trimmedAmount) {
            setErrorMessage("Vui lòng nhập số tiền hợp lệ.");
          } else {
            setErrorMessage("Vui lòng nhập thuế suất VAT hợp lệ.");
          }
        } else {
          setErrorMessage(null);
        }
        return false;
      }

      const validation = validateVATInput({
        amount: amountValue,
        vatRate: rateValue,
        mode: calcMode
      });

      if (!validation.isValid || validation.amount === undefined || validation.vatRate === undefined) {
        setResult(null);
        if (showError) {
          setErrorMessage(validation.error ?? "Vui lòng nhập số tiền hợp lệ.");
        } else {
          setErrorMessage(null);
        }
        return false;
      }

      setErrorMessage(null);
      setResult(
        calculateVAT({
          amount: validation.amount,
          vatRate: validation.vatRate,
          mode: calcMode
        })
      );
      return true;
    },
    []
  );

  useEffect(() => {
    if (!showValidationError) {
      runCalculate(amount, effectiveRate, mode, false);
    }
  }, [amount, effectiveRate, mode, runCalculate, showValidationError]);

  const handleCalculate = () => {
    setStatusMessage(null);
    setShowValidationError(true);
    runCalculate(amount, effectiveRate, mode, true);
  };

  const handleClear = () => {
    setAmount("");
    setResult(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setShowValidationError(false);
    amountRef.current?.focus();
  };

  const applyExample = (example: QuickExample) => {
    setAmount(example.amount);
    setMode(example.mode);
    const preset = resolveRatePreset(example.rate);
    setRatePreset(preset);
    if (preset === "custom") {
      setCustomRate(example.rate);
    }
    setStatusMessage(null);
    setShowValidationError(false);
    runCalculate(example.amount, example.rate, example.mode, false);
  };

  const handlePasteSample = () => {
    const sampleAmount = mode === "forward" ? FORWARD_SAMPLE_AMOUNT : REVERSE_SAMPLE_AMOUNT;
    setAmount(sampleAmount);
    setRatePreset(10);
    setStatusMessage(null);
    setShowValidationError(false);
    runCalculate(sampleAmount, DEFAULT_RATE, mode, false);
  };

  const handleCopyResult = async () => {
    if (!result) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatVATResultForCopy(result));
    if (ok) {
      reportStatus("Đã sao chép kết quả VAT!");
      return;
    }

    reportStatus("Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const handleCopyValue = async (value: number, successMessage: string) => {
    if (!result) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatCurrencyVND(value));
    if (ok) {
      reportStatus(successMessage);
      return;
    }

    reportStatus("Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const handleRatePresetClick = (preset: VatRatePreset) => {
    setRatePreset(preset);
    setShowValidationError(false);
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Công Cụ Tính Thuế VAT</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Tính thuế VAT nhanh chóng theo 2 chiều: từ giá chưa có VAT ra giá sau VAT, hoặc từ giá đã có VAT tách
          ngược ra giá trước thuế và tiền thuế.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="vat-inputs" className="space-y-4">
          <h2 className="sr-only" id="vat-inputs">
            Nhập liệu
          </h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-200" htmlFor="vat-amount">
                {VAT_AMOUNT_LABELS[mode]}
              </label>
              <input
                className={inputClassName}
                id="vat-amount"
                inputMode="decimal"
                onChange={(event) => {
                  setShowValidationError(false);
                  setAmount(event.target.value);
                }}
                placeholder="Ví dụ: 10000000 hoặc 10.000.000"
                ref={amountRef}
                type="text"
                value={amount}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200" htmlFor="vat-custom-rate">
                Thuế suất VAT (%)
              </label>
              <div className="flex flex-wrap gap-2">
                {VAT_RATE_PRESETS.map((preset) => (
                  <button
                    className={rateButtonClassName(ratePreset === preset)}
                    key={preset}
                    onClick={() => handleRatePresetClick(preset)}
                    type="button"
                  >
                    {preset}%
                  </button>
                ))}
                <button
                  className={rateButtonClassName(ratePreset === "custom")}
                  onClick={() => handleRatePresetClick("custom")}
                  type="button"
                >
                  Tùy chỉnh
                </button>
              </div>
              {ratePreset === "custom" ? (
                <input
                  className={inputClassName}
                  id="vat-custom-rate"
                  inputMode="decimal"
                  onChange={(event) => {
                    setShowValidationError(false);
                    setCustomRate(event.target.value);
                  }}
                  placeholder="Ví dụ: 10"
                  type="text"
                  value={customRate}
                />
              ) : null}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-200">Phương thức tính</legend>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-3 transition hover:border-cyan-300/20">
                  <input
                    checked={mode === "forward"}
                    className="mt-0.5 accent-cyan-300"
                    name="vat-mode"
                    onChange={() => {
                      setShowValidationError(false);
                      setMode("forward");
                    }}
                    type="radio"
                  />
                  <span className="text-sm text-zinc-200">Tính xuôi — Số tiền chưa có VAT</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-3 transition hover:border-cyan-300/20">
                  <input
                    checked={mode === "reverse"}
                    className="mt-0.5 accent-cyan-300"
                    name="vat-mode"
                    onChange={() => {
                      setShowValidationError(false);
                      setMode("reverse");
                    }}
                    type="radio"
                  />
                  <span className="text-sm text-zinc-200">Tính ngược — Số tiền đã có VAT</span>
                </label>
              </div>
            </fieldset>
          </div>

          {errorMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <UtilityActionBar primary={{ label: "Tính VAT", onClick: handleCalculate }}>
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

        <section aria-labelledby="vat-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="vat-results">
            Kết quả
          </h2>

          {result ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-1">
                <ResultCard
                  label="Số tiền trước thuế"
                  onCopy={() => handleCopyValue(result.beforeTaxAmount, "Đã sao chép số tiền trước thuế!")}
                  value={formatCurrencyVND(result.beforeTaxAmount)}
                />
                <ResultCard
                  label="Thuế VAT"
                  onCopy={() => handleCopyValue(result.vatAmount, "Đã sao chép tiền VAT!")}
                  value={formatCurrencyVND(result.vatAmount)}
                />
                <ResultCard
                  label="Số tiền sau thuế"
                  onCopy={() => handleCopyValue(result.afterTaxAmount, "Đã sao chép số tiền sau thuế!")}
                  value={formatCurrencyVND(result.afterTaxAmount)}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400">
                <p>
                  Thuế suất áp dụng:{" "}
                  <span className="font-medium text-zinc-200">{formatVatRate(result.vatRate)}</span>
                </p>
                <p>
                  Phương thức tính:{" "}
                  <span className="font-medium text-zinc-200">{VAT_MODE_LABELS[result.mode]}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
              <p className="text-sm text-zinc-500">
                Nhập số tiền, chọn thuế suất và phương thức tính, sau đó bấm &ldquo;Tính VAT&rdquo; để xem kết quả.
              </p>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="vat-formula" className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <h2 className="text-sm font-bold text-zinc-200" id="vat-formula">
          Hướng dẫn công thức
        </h2>
        <div className="grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-medium text-zinc-300">Tính xuôi:</p>
            <p>Thuế VAT = Giá chưa thuế × Thuế suất</p>
            <p>Giá sau thuế = Giá chưa thuế + Thuế VAT</p>
          </div>
          <div>
            <p className="mb-1 font-medium text-zinc-300">Tính ngược:</p>
            <p>Giá chưa thuế = Giá đã có thuế ÷ (1 + Thuế suất)</p>
            <p>Thuế VAT = Giá đã có thuế − Giá chưa thuế</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="vat-usage" className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
        <h2 className="text-sm font-bold text-zinc-200" id="vat-usage">
          Cách sử dụng công cụ tính thuế VAT
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>Nhập số tiền cần tính.</li>
          <li>Chọn thuế suất VAT, ví dụ 5%, 8%, 10% hoặc nhập mức tùy chỉnh.</li>
          <li>
            Chọn phương thức tính:
            <ul className="mt-1 list-disc pl-5">
              <li>Tính xuôi nếu số tiền bạn nhập là giá chưa có VAT.</li>
              <li>Tính ngược nếu số tiền bạn nhập là giá đã bao gồm VAT.</li>
            </ul>
          </li>
          <li>Bấm &ldquo;Tính VAT&rdquo; để xem số tiền trước thuế, tiền VAT và số tiền sau thuế.</li>
          <li>Bấm &ldquo;Sao chép kết quả&rdquo; nếu cần dùng trong báo giá, hóa đơn hoặc ghi chú.</li>
        </ol>
        <p className="text-xs text-zinc-500">
          Bạn có thể chọn thuế suất phù hợp với trường hợp của mình.
        </p>
      </section>

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="font-semibold">Lưu ý:</strong> Công cụ chỉ hỗ trợ tính toán số học. Thuế suất VAT thực tế có
        thể phụ thuộc vào loại hàng hóa, dịch vụ, thời điểm áp dụng và quy định pháp luật hiện hành. Vui lòng kiểm tra
        lại với kế toán hoặc cơ quan chuyên môn nếu dùng cho hóa đơn, kê khai thuế hoặc hồ sơ chính thức.
      </p>

      <section aria-labelledby="vat-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="vat-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm leading-relaxed text-zinc-300 transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={example.label}
              onClick={() => applyExample(example)}
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
        Sao chép {label.toLowerCase()}
      </button>
    </div>
  );
}
