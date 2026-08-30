import { cleanMoneyInput as cleanMoneyInputString } from "@/lib/utilities/money-to-words-vn";

export type VATCalculationMode = "forward" | "reverse";

export interface VATInput {
  amount: number;
  vatRate: number;
  mode: VATCalculationMode;
}

export interface VATResult {
  mode: VATCalculationMode;
  vatRate: number;
  beforeTaxAmount: number;
  vatAmount: number;
  afterTaxAmount: number;
}

export const MAX_MONEY_AMOUNT = 999_999_999_999_999;
export const MAX_VAT_RATE = 100;

export const VAT_MODE_LABELS: Record<VATCalculationMode, string> = {
  forward: "Tính xuôi từ số tiền chưa có VAT",
  reverse: "Tính ngược từ số tiền đã có VAT"
};

export const VAT_AMOUNT_LABELS: Record<VATCalculationMode, string> = {
  forward: "Số tiền chưa có VAT",
  reverse: "Số tiền đã có VAT"
};

export const VAT_RATE_PRESETS = [0, 5, 8, 10] as const;
export type VatRatePreset = (typeof VAT_RATE_PRESETS)[number] | "custom";

export function cleanMoneyInput(input: string): number {
  const cleaned = cleanMoneyInputString(input);
  if (!cleaned) return NaN;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return NaN;

  return parsed;
}

export function cleanVatRateInput(input: string): number {
  let value = input.trim();
  if (!value) return NaN;

  value = value.replace(/%/g, "").replace(",", ".");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;

  return parsed;
}

export function formatCurrencyVND(value: number): string {
  const rounded = Math.round(value);
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${formatted}đ`;
}

export function formatVatRate(value: number): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toString().replace(/\.?0+$/, "");
  return `${formatted}%`;
}

export function validateMoneyInput(value: string): {
  isValid: boolean;
  amount?: number;
  error?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ." };
  }

  const amount = cleanMoneyInput(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_MONEY_AMOUNT) {
    return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ." };
  }

  return { isValid: true, amount };
}

export function validateVatRateInput(value: string): {
  isValid: boolean;
  vatRate?: number;
  error?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập thuế suất VAT hợp lệ." };
  }

  const vatRate = cleanVatRateInput(value);
  if (!Number.isFinite(vatRate) || vatRate < 0) {
    return { isValid: false, error: "Vui lòng nhập thuế suất VAT hợp lệ." };
  }

  if (vatRate > MAX_VAT_RATE) {
    return { isValid: false, error: "Thuế suất quá cao, vui lòng kiểm tra lại." };
  }

  return { isValid: true, vatRate };
}

export function validateVATInput(input: {
  amount: string;
  vatRate: string;
  mode: VATCalculationMode;
}): {
  isValid: boolean;
  amount?: number;
  vatRate?: number;
  error?: string;
} {
  const amountValidation = validateMoneyInput(input.amount);
  if (!amountValidation.isValid || amountValidation.amount === undefined) {
    return { isValid: false, error: amountValidation.error };
  }

  const rateValidation = validateVatRateInput(input.vatRate);
  if (!rateValidation.isValid || rateValidation.vatRate === undefined) {
    return { isValid: false, error: rateValidation.error };
  }

  return {
    isValid: true,
    amount: amountValidation.amount,
    vatRate: rateValidation.vatRate
  };
}

export function calculateVATForward(amountBeforeTax: number, vatRate: number): VATResult {
  const vatAmount = Math.round(amountBeforeTax * (vatRate / 100));
  const afterTaxAmount = amountBeforeTax + vatAmount;

  return {
    mode: "forward",
    vatRate,
    beforeTaxAmount: amountBeforeTax,
    vatAmount,
    afterTaxAmount
  };
}

export function calculateVATReverse(amountAfterTax: number, vatRate: number): VATResult {
  const beforeTaxAmount = Math.round(amountAfterTax / (1 + vatRate / 100));
  const vatAmount = amountAfterTax - beforeTaxAmount;

  return {
    mode: "reverse",
    vatRate,
    beforeTaxAmount,
    vatAmount,
    afterTaxAmount: amountAfterTax
  };
}

export function calculateVAT(input: VATInput): VATResult {
  if (input.mode === "forward") {
    return calculateVATForward(input.amount, input.vatRate);
  }

  return calculateVATReverse(input.amount, input.vatRate);
}

export function formatVATResultForCopy(result: VATResult): string {
  return [
    "Kết quả tính thuế VAT:",
    `Phương thức: ${VAT_MODE_LABELS[result.mode]}`,
    `Số tiền trước thuế: ${formatCurrencyVND(result.beforeTaxAmount)}`,
    `Thuế suất VAT: ${formatVatRate(result.vatRate)}`,
    `Thuế VAT: ${formatCurrencyVND(result.vatAmount)}`,
    `Số tiền sau thuế: ${formatCurrencyVND(result.afterTaxAmount)}`
  ].join("\n");
}
