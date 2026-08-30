import { cleanMoneyInput as cleanMoneyInputString } from "@/lib/utilities/money-to-words-vn";

export type ContributionFrequency = "monthly" | "quarterly" | "yearly";
export type CompoundFrequency = "monthly" | "quarterly" | "yearly";
export type TimeUnit = "months" | "years";
export type SavingsPayoutType = "end_term" | "monthly" | "compound";
export type CalculatorMode = "compound" | "savings" | "loan";
export type LoanRepaymentType = "fixed_monthly_payment" | "declining_balance" | "interest_only";

export interface CompoundInterestInput {
  initialAmount: number;
  recurringContribution: number;
  contributionFrequency: ContributionFrequency;
  annualRate: number;
  duration: number;
  durationUnit: TimeUnit;
  compoundFrequency: CompoundFrequency;
  contributionTiming?: "beginning" | "end";
}

export interface CompoundScheduleRow {
  period: number;
  label: string;
  startingBalance: number;
  contribution: number;
  interest: number;
  endingBalance: number;
}

export interface CompoundInterestResult {
  finalAmount: number;
  initialAmount: number;
  totalContribution: number;
  totalPrincipal: number;
  totalInterest: number;
  growthPercent: number;
  schedule: CompoundScheduleRow[];
}

export interface SavingsInterestInput {
  principal: number;
  annualRate: number;
  term: number;
  termUnit: TimeUnit;
  payoutType: SavingsPayoutType;
}

export interface SavingsScheduleRow {
  month: number;
  principal: number;
  monthlyInterest: number;
  accumulatedInterest: number;
  estimatedTotal: number;
}

export interface SavingsInterestResult {
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyInterest?: number;
  totalInterest: number;
  finalAmount: number;
  schedule: SavingsScheduleRow[];
}

export interface LoanInput {
  principal: number;
  annualRate: number;
  term: number;
  termUnit: TimeUnit;
  repaymentType: LoanRepaymentType;
}

export interface LoanScheduleRow {
  month: number;
  startingBalance: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  endingBalance: number;
}

export interface LoanResult {
  principal: number;
  annualRate: number;
  termMonths: number;
  repaymentType: LoanRepaymentType;
  firstMonthPayment: number;
  lastMonthPayment: number;
  fixedMonthlyPayment?: number;
  monthlyPrincipal?: number;
  monthlyInterestOnly?: number;
  totalInterest: number;
  totalPayment: number;
  schedule: LoanScheduleRow[];
}

export const MAX_MONEY_AMOUNT = 999_999_999_999_999;
export const MAX_DURATION_YEARS = 100;
export const MAX_DURATION_MONTHS = 1200;
export const MAX_LOAN_TERM_YEARS = 50;
export const MAX_LOAN_TERM_MONTHS = 600;
export const HIGH_RATE_WARNING_THRESHOLD = 30;
export const MAX_ANNUAL_RATE = 100;

const FREQUENCY_MONTHS: Record<ContributionFrequency | CompoundFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12
};

const COMPOUNDS_PER_YEAR: Record<CompoundFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1
};

export function cleanMoneyInput(input: string): number {
  const cleaned = cleanMoneyInputString(input);
  if (!cleaned) return NaN;

  const parsed = Number(cleaned);
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

export function durationToMonths(duration: number, unit: TimeUnit): number {
  return unit === "years" ? duration * 12 : duration;
}

function parsePositiveDecimal(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return parsed;
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return parsed;
}

export function validateMoneyInput(
  value: string,
  options: { allowZero?: boolean; fieldLabel?: string } = {}
): { isValid: boolean; amount?: number; error?: string; warning?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ." };
  }

  const amount = cleanMoneyInput(value);
  if (!Number.isFinite(amount)) {
    return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ." };
  }

  if (amount < 0 || (!options.allowZero && amount === 0)) {
    return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ." };
  }

  if (amount > MAX_MONEY_AMOUNT) {
    return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ." };
  }

  return { isValid: true, amount };
}

export function validateRateInput(value: string): {
  isValid: boolean;
  rate?: number;
  error?: string;
  warning?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập lãi suất hợp lệ." };
  }

  const rate = parsePositiveDecimal(value);
  if (rate === null) {
    return { isValid: false, error: "Vui lòng nhập lãi suất hợp lệ." };
  }

  if (rate > MAX_ANNUAL_RATE) {
    return { isValid: false, error: "Lãi suất quá cao, vui lòng kiểm tra lại." };
  }

  const warning =
    rate > HIGH_RATE_WARNING_THRESHOLD ? "Lãi suất bạn nhập khá cao, vui lòng kiểm tra lại." : undefined;

  return { isValid: true, rate, warning };
}

export function validateDurationInput(
  value: string,
  unit: TimeUnit,
  options: { maxMonths?: number; errorMessage?: string } = {}
): { isValid: boolean; duration?: number; error?: string } {
  const errorMessage = options.errorMessage ?? "Vui lòng nhập thời gian hợp lệ.";
  const maxMonths = options.maxMonths ?? MAX_DURATION_MONTHS;
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: errorMessage };
  }

  const duration = parsePositiveInteger(value);
  if (duration === null) {
    return { isValid: false, error: errorMessage };
  }

  const months = durationToMonths(duration, unit);
  if (months > maxMonths) {
    return { isValid: false, error: errorMessage };
  }

  return { isValid: true, duration };
}

export function validateLoanPrincipalInput(value: string): {
  isValid: boolean;
  amount?: number;
  error?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập số tiền vay hợp lệ." };
  }

  const amount = cleanMoneyInput(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { isValid: false, error: "Vui lòng nhập số tiền vay hợp lệ." };
  }

  if (amount > MAX_MONEY_AMOUNT) {
    return { isValid: false, error: "Vui lòng nhập số tiền vay hợp lệ." };
  }

  return { isValid: true, amount };
}

export function validateLoanRateInput(value: string): {
  isValid: boolean;
  rate?: number;
  error?: string;
  warning?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: "Vui lòng nhập lãi suất vay hợp lệ." };
  }

  const rate = parsePositiveDecimal(value);
  if (rate === null) {
    return { isValid: false, error: "Vui lòng nhập lãi suất vay hợp lệ." };
  }

  if (rate > MAX_ANNUAL_RATE) {
    return { isValid: false, error: "Lãi suất vay quá cao, vui lòng kiểm tra lại." };
  }

  const warning =
    rate > HIGH_RATE_WARNING_THRESHOLD ? "Lãi suất bạn nhập khá cao, vui lòng kiểm tra lại." : undefined;

  return { isValid: true, rate, warning };
}

export function validateLoanInput(input: LoanInput): { isValid: boolean; error?: string } {
  if (input.principal <= 0 || input.principal > MAX_MONEY_AMOUNT) {
    return { isValid: false, error: "Vui lòng nhập số tiền vay hợp lệ." };
  }

  if (input.annualRate < 0 || input.annualRate > MAX_ANNUAL_RATE) {
    return { isValid: false, error: "Vui lòng nhập lãi suất vay hợp lệ." };
  }

  const termMonths = durationToMonths(input.term, input.termUnit);
  if (termMonths <= 0 || termMonths > MAX_LOAN_TERM_MONTHS) {
    return { isValid: false, error: "Vui lòng nhập thời hạn vay hợp lệ." };
  }

  return { isValid: true };
}

export function validateLoanForm(input: {
  principal: string;
  annualRate: string;
  term: string;
  termUnit: TimeUnit;
  repaymentType: LoanRepaymentType;
}): {
  isValid: boolean;
  data?: LoanInput;
  error?: string;
  warning?: string;
} {
  const principalTrimmed = input.principal.trim();
  const rateTrimmed = input.annualRate.trim();
  const termTrimmed = input.term.trim();

  if (!principalTrimmed || !rateTrimmed || !termTrimmed) {
    return { isValid: false, error: "Vui lòng nhập đầy đủ thông tin cần tính." };
  }

  const principalValidation = validateLoanPrincipalInput(input.principal);
  if (!principalValidation.isValid || principalValidation.amount === undefined) {
    return { isValid: false, error: principalValidation.error };
  }

  const rateValidation = validateLoanRateInput(input.annualRate);
  if (!rateValidation.isValid || rateValidation.rate === undefined) {
    return { isValid: false, error: rateValidation.error };
  }

  const termValidation = validateDurationInput(input.term, input.termUnit, {
    maxMonths: MAX_LOAN_TERM_MONTHS,
    errorMessage: "Vui lòng nhập thời hạn vay hợp lệ."
  });
  if (!termValidation.isValid || termValidation.duration === undefined) {
    return { isValid: false, error: termValidation.error };
  }

  const data: LoanInput = {
    principal: principalValidation.amount,
    annualRate: rateValidation.rate,
    term: termValidation.duration,
    termUnit: input.termUnit,
    repaymentType: input.repaymentType
  };

  const inputValidation = validateLoanInput(data);
  if (!inputValidation.isValid) {
    return { isValid: false, error: inputValidation.error };
  }

  return {
    isValid: true,
    warning: rateValidation.warning,
    data
  };
}

export function validateCompoundForm(input: {
  initialAmount: string;
  recurringContribution: string;
  contributionFrequency: ContributionFrequency;
  annualRate: string;
  duration: string;
  durationUnit: TimeUnit;
  compoundFrequency: CompoundFrequency;
}): {
  isValid: boolean;
  data?: CompoundInterestInput;
  error?: string;
  warning?: string;
} {
  const initialTrimmed = input.initialAmount.trim();
  const rateTrimmed = input.annualRate.trim();
  const durationTrimmed = input.duration.trim();
  const contributionTrimmed = input.recurringContribution.trim();

  if (!initialTrimmed || !rateTrimmed || !durationTrimmed) {
    return { isValid: false, error: "Vui lòng nhập đầy đủ thông tin cần tính." };
  }

  const initialValidation = validateMoneyInput(input.initialAmount);
  if (!initialValidation.isValid || initialValidation.amount === undefined) {
    return { isValid: false, error: initialValidation.error };
  }

  const contributionValidation = validateMoneyInput(input.recurringContribution, { allowZero: true });
  if (!contributionValidation.isValid || contributionValidation.amount === undefined) {
    return { isValid: false, error: contributionValidation.error };
  }

  const rateValidation = validateRateInput(input.annualRate);
  if (!rateValidation.isValid || rateValidation.rate === undefined) {
    return { isValid: false, error: rateValidation.error };
  }

  const durationValidation = validateDurationInput(input.duration, input.durationUnit);
  if (!durationValidation.isValid || durationValidation.duration === undefined) {
    return { isValid: false, error: durationValidation.error };
  }

  return {
    isValid: true,
    warning: rateValidation.warning,
    data: {
      initialAmount: initialValidation.amount,
      recurringContribution: contributionValidation.amount,
      contributionFrequency: input.contributionFrequency,
      annualRate: rateValidation.rate,
      duration: durationValidation.duration,
      durationUnit: input.durationUnit,
      compoundFrequency: input.compoundFrequency,
      contributionTiming: "end"
    }
  };
}

export function validateSavingsForm(input: {
  principal: string;
  annualRate: string;
  term: string;
  termUnit: TimeUnit;
  payoutType: SavingsPayoutType;
}): {
  isValid: boolean;
  data?: SavingsInterestInput;
  error?: string;
  warning?: string;
} {
  const principalTrimmed = input.principal.trim();
  const rateTrimmed = input.annualRate.trim();
  const termTrimmed = input.term.trim();

  if (!principalTrimmed || !rateTrimmed || !termTrimmed) {
    return { isValid: false, error: "Vui lòng nhập đầy đủ thông tin cần tính." };
  }

  const principalValidation = validateMoneyInput(input.principal);
  if (!principalValidation.isValid || principalValidation.amount === undefined) {
    return { isValid: false, error: principalValidation.error };
  }

  const rateValidation = validateRateInput(input.annualRate);
  if (!rateValidation.isValid || rateValidation.rate === undefined) {
    return { isValid: false, error: rateValidation.error };
  }

  const termValidation = validateDurationInput(input.term, input.termUnit);
  if (!termValidation.isValid || termValidation.duration === undefined) {
    return { isValid: false, error: termValidation.error };
  }

  return {
    isValid: true,
    warning: rateValidation.warning,
    data: {
      principal: principalValidation.amount,
      annualRate: rateValidation.rate,
      term: termValidation.duration,
      termUnit: input.termUnit,
      payoutType: input.payoutType
    }
  };
}

export function generateCompoundSchedule(input: CompoundInterestInput): CompoundScheduleRow[] {
  const totalMonths = durationToMonths(input.duration, input.durationUnit);
  const compoundInterval = FREQUENCY_MONTHS[input.compoundFrequency];
  const contributionInterval = FREQUENCY_MONTHS[input.contributionFrequency];
  const ratePerCompoundPeriod = input.annualRate / 100 / COMPOUNDS_PER_YEAR[input.compoundFrequency];
  const timing = input.contributionTiming ?? "end";

  const schedule: CompoundScheduleRow[] = [];
  let balance = input.initialAmount;

  for (let month = 1; month <= totalMonths; month += 1) {
    const startingBalance = balance;
    let contribution = 0;
    let interest = 0;

    if (timing === "beginning" && month % contributionInterval === 0) {
      contribution = input.recurringContribution;
      balance += contribution;
    }

    if (month % compoundInterval === 0) {
      interest = balance * ratePerCompoundPeriod;
      balance += interest;
    }

    if (timing === "end" && month % contributionInterval === 0) {
      contribution = input.recurringContribution;
      balance += contribution;
    }

    schedule.push({
      period: month,
      label: `Tháng ${month}`,
      startingBalance,
      contribution,
      interest,
      endingBalance: balance
    });
  }

  return schedule;
}

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const schedule = generateCompoundSchedule(input);
  const totalMonths = durationToMonths(input.duration, input.durationUnit);
  const contributionInterval = FREQUENCY_MONTHS[input.contributionFrequency];
  const contributionCount = Math.floor(totalMonths / contributionInterval);
  const totalContribution = input.recurringContribution * contributionCount;
  const totalPrincipal = input.initialAmount + totalContribution;

  let finalAmount: number;
  if (schedule.length > 0) {
    finalAmount = schedule[schedule.length - 1].endingBalance;
  } else if (
    input.recurringContribution === 0 &&
    input.durationUnit === "years" &&
    Number.isInteger(input.duration)
  ) {
    const n = COMPOUNDS_PER_YEAR[input.compoundFrequency];
    const t = input.duration;
    finalAmount = input.initialAmount * (1 + input.annualRate / 100 / n) ** (n * t);
  } else {
    finalAmount = input.initialAmount;
  }

  const totalInterest = finalAmount - totalPrincipal;
  const growthPercent = totalPrincipal > 0 ? (totalInterest / totalPrincipal) * 100 : 0;

  return {
    finalAmount,
    initialAmount: input.initialAmount,
    totalContribution,
    totalPrincipal,
    totalInterest,
    growthPercent,
    schedule
  };
}

export function generateSavingsSchedule(input: SavingsInterestInput): SavingsScheduleRow[] {
  const termMonths = durationToMonths(input.term, input.termUnit);
  const schedule: SavingsScheduleRow[] = [];
  const annualRateDecimal = input.annualRate / 100;

  if (input.payoutType === "end_term") {
    const totalInterest = input.principal * annualRateDecimal * (termMonths / 12);
    const monthlyDisplayInterest = termMonths > 0 ? totalInterest / termMonths : 0;

    for (let month = 1; month <= termMonths; month += 1) {
      const accumulatedInterest = monthlyDisplayInterest * month;
      schedule.push({
        month,
        principal: input.principal,
        monthlyInterest: monthlyDisplayInterest,
        accumulatedInterest,
        estimatedTotal: input.principal + accumulatedInterest
      });
    }

    return schedule;
  }

  if (input.payoutType === "monthly") {
    const monthlyInterest = input.principal * annualRateDecimal / 12;
    let accumulatedInterest = 0;

    for (let month = 1; month <= termMonths; month += 1) {
      accumulatedInterest += monthlyInterest;
      schedule.push({
        month,
        principal: input.principal,
        monthlyInterest,
        accumulatedInterest,
        estimatedTotal: input.principal + accumulatedInterest
      });
    }

    return schedule;
  }

  let balance = input.principal;
  const monthlyRate = annualRateDecimal / 12;

  for (let month = 1; month <= termMonths; month += 1) {
    const startingPrincipal = balance;
    const monthlyInterest = balance * monthlyRate;
    balance += monthlyInterest;

    schedule.push({
      month,
      principal: startingPrincipal,
      monthlyInterest,
      accumulatedInterest: balance - input.principal,
      estimatedTotal: balance
    });
  }

  return schedule;
}

export function calculateSavingsInterest(input: SavingsInterestInput): SavingsInterestResult {
  const termMonths = durationToMonths(input.term, input.termUnit);
  const annualRateDecimal = input.annualRate / 100;
  const schedule = generateSavingsSchedule(input);

  if (input.payoutType === "end_term") {
    const totalInterest = input.principal * annualRateDecimal * (termMonths / 12);
    return {
      principal: input.principal,
      annualRate: input.annualRate,
      termMonths,
      totalInterest,
      finalAmount: input.principal + totalInterest,
      schedule
    };
  }

  if (input.payoutType === "monthly") {
    const monthlyInterest = input.principal * annualRateDecimal / 12;
    const totalInterest = monthlyInterest * termMonths;
    return {
      principal: input.principal,
      annualRate: input.annualRate,
      termMonths,
      monthlyInterest,
      totalInterest,
      finalAmount: input.principal + totalInterest,
      schedule
    };
  }

  const finalAmount =
    termMonths > 0 ? input.principal * (1 + annualRateDecimal / 12) ** termMonths : input.principal;
  const totalInterest = finalAmount - input.principal;

  return {
    principal: input.principal,
    annualRate: input.annualRate,
    termMonths,
    totalInterest,
    finalAmount,
    schedule
  };
}

export function formatGrowthPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatCompoundResultForCopy(
  input: CompoundInterestInput,
  result: CompoundInterestResult
): string {
  const durationLabel =
    input.durationUnit === "years" ? `${input.duration} năm` : `${input.duration} tháng`;
  const contributionFreqLabel =
    input.contributionFrequency === "monthly"
      ? "tháng"
      : input.contributionFrequency === "quarterly"
        ? "quý"
        : "năm";

  return [
    "Kết quả tính lãi suất kép:",
    `Số tiền ban đầu: ${formatCurrencyVND(result.initialAmount)}`,
    `Góp thêm định kỳ: ${formatCurrencyVND(input.recurringContribution)}/${contributionFreqLabel}`,
    `Lãi suất năm: ${input.annualRate}%`,
    `Thời gian: ${durationLabel}`,
    `Tổng tiền cuối kỳ: ${formatCurrencyVND(result.finalAmount)}`,
    `Tổng tiền gốc: ${formatCurrencyVND(result.totalPrincipal)}`,
    `Tổng tiền lãi: ${formatCurrencyVND(result.totalInterest)}`
  ].join("\n");
}

export function formatSavingsResultForCopy(
  input: SavingsInterestInput,
  result: SavingsInterestResult
): string {
  const termLabel = input.termUnit === "years" ? `${input.term} năm` : `${input.term} tháng`;

  const lines = [
    "Kết quả tính lãi tiết kiệm:",
    `Số tiền gửi: ${formatCurrencyVND(result.principal)}`,
    `Lãi suất năm: ${result.annualRate}%`,
    `Kỳ hạn: ${termLabel}`,
    `Tiền lãi dự kiến: ${formatCurrencyVND(result.totalInterest)}`,
    `Tổng nhận cuối kỳ: ${formatCurrencyVND(result.finalAmount)}`
  ];

  if (result.monthlyInterest !== undefined) {
    lines.splice(4, 0, `Lãi mỗi tháng: ${formatCurrencyVND(result.monthlyInterest)}`);
  }

  return lines.join("\n");
}

export const CONTRIBUTION_FREQUENCY_LABELS: Record<ContributionFrequency, string> = {
  monthly: "Hàng tháng",
  quarterly: "Hàng quý",
  yearly: "Hàng năm"
};

export const COMPOUND_FREQUENCY_LABELS: Record<CompoundFrequency, string> = {
  monthly: "Hàng tháng",
  quarterly: "Hàng quý",
  yearly: "Hàng năm"
};

export const SAVINGS_PAYOUT_LABELS: Record<SavingsPayoutType, string> = {
  end_term: "Nhận lãi cuối kỳ",
  monthly: "Nhận lãi hàng tháng",
  compound: "Nhập lãi vào gốc"
};

export const LOAN_REPAYMENT_LABELS: Record<LoanRepaymentType, string> = {
  fixed_monthly_payment: "Trả góp đều hàng tháng",
  declining_balance: "Trả theo dư nợ giảm dần",
  interest_only: "Trả lãi hàng tháng, gốc trả cuối kỳ"
};

function getLoanTermMonths(input: LoanInput): number {
  return durationToMonths(input.term, input.termUnit);
}

function getMonthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

function calculateFixedMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  if (monthlyRate === 0) return principal / termMonths;

  const factor = (1 + monthlyRate) ** termMonths;
  return (principal * monthlyRate * factor) / (factor - 1);
}

function buildLoanResultBase(input: LoanInput, schedule: LoanScheduleRow[]): Omit<LoanResult, "fixedMonthlyPayment" | "monthlyPrincipal" | "monthlyInterestOnly"> {
  const firstMonthPayment = schedule[0]?.totalPayment ?? 0;
  const lastMonthPayment = schedule[schedule.length - 1]?.totalPayment ?? 0;
  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPayment, 0);
  const totalPayment = input.principal + totalInterest;

  return {
    principal: input.principal,
    annualRate: input.annualRate,
    termMonths: getLoanTermMonths(input),
    repaymentType: input.repaymentType,
    firstMonthPayment,
    lastMonthPayment,
    totalInterest,
    totalPayment,
    schedule
  };
}

export function generateLoanSchedule(input: LoanInput): LoanScheduleRow[] {
  switch (input.repaymentType) {
    case "fixed_monthly_payment":
      return generateFixedMonthlyLoanSchedule(input);
    case "declining_balance":
      return generateDecliningBalanceLoanSchedule(input);
    case "interest_only":
      return generateInterestOnlyLoanSchedule(input);
    default:
      return [];
  }
}

function generateFixedMonthlyLoanSchedule(input: LoanInput): LoanScheduleRow[] {
  const termMonths = getLoanTermMonths(input);
  const monthlyRate = getMonthlyRate(input.annualRate);
  const monthlyPayment = calculateFixedMonthlyPayment(input.principal, monthlyRate, termMonths);
  const schedule: LoanScheduleRow[] = [];
  let remainingBalance = input.principal;

  for (let month = 1; month <= termMonths; month += 1) {
    const startingBalance = remainingBalance;
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);

    schedule.push({
      month,
      startingBalance,
      principalPayment,
      interestPayment,
      totalPayment: monthlyPayment,
      endingBalance: remainingBalance
    });
  }

  return schedule;
}

function generateDecliningBalanceLoanSchedule(input: LoanInput): LoanScheduleRow[] {
  const termMonths = getLoanTermMonths(input);
  const monthlyRate = getMonthlyRate(input.annualRate);
  const monthlyPrincipal = input.principal / termMonths;
  const schedule: LoanScheduleRow[] = [];
  let remainingBalance = input.principal;

  for (let month = 1; month <= termMonths; month += 1) {
    const startingBalance = remainingBalance;
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = month === termMonths ? remainingBalance : monthlyPrincipal;
    const totalPayment = principalPayment + interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);

    schedule.push({
      month,
      startingBalance,
      principalPayment,
      interestPayment,
      totalPayment,
      endingBalance: remainingBalance
    });
  }

  return schedule;
}

function generateInterestOnlyLoanSchedule(input: LoanInput): LoanScheduleRow[] {
  const termMonths = getLoanTermMonths(input);
  const monthlyRate = getMonthlyRate(input.annualRate);
  const monthlyInterest = input.principal * monthlyRate;
  const schedule: LoanScheduleRow[] = [];

  for (let month = 1; month <= termMonths; month += 1) {
    const isLastMonth = month === termMonths;
    const principalPayment = isLastMonth ? input.principal : 0;
    const interestPayment = monthlyInterest;
    const totalPayment = principalPayment + interestPayment;

    schedule.push({
      month,
      startingBalance: input.principal,
      principalPayment,
      interestPayment,
      totalPayment,
      endingBalance: isLastMonth ? 0 : input.principal
    });
  }

  return schedule;
}

export function calculateFixedMonthlyLoan(input: LoanInput): LoanResult {
  const termMonths = getLoanTermMonths(input);
  const monthlyRate = getMonthlyRate(input.annualRate);
  const schedule = generateFixedMonthlyLoanSchedule(input);
  const fixedMonthlyPayment = calculateFixedMonthlyPayment(input.principal, monthlyRate, termMonths);

  return {
    ...buildLoanResultBase(input, schedule),
    fixedMonthlyPayment
  };
}

export function calculateDecliningBalanceLoan(input: LoanInput): LoanResult {
  const termMonths = getLoanTermMonths(input);
  const schedule = generateDecliningBalanceLoanSchedule(input);

  return {
    ...buildLoanResultBase(input, schedule),
    monthlyPrincipal: input.principal / termMonths
  };
}

export function calculateInterestOnlyLoan(input: LoanInput): LoanResult {
  const monthlyRate = getMonthlyRate(input.annualRate);
  const schedule = generateInterestOnlyLoanSchedule(input);

  return {
    ...buildLoanResultBase(input, schedule),
    monthlyInterestOnly: input.principal * monthlyRate
  };
}

export function calculateLoan(input: LoanInput): LoanResult {
  switch (input.repaymentType) {
    case "fixed_monthly_payment":
      return calculateFixedMonthlyLoan(input);
    case "declining_balance":
      return calculateDecliningBalanceLoan(input);
    case "interest_only":
      return calculateInterestOnlyLoan(input);
    default:
      return calculateFixedMonthlyLoan(input);
  }
}

export function formatLoanResultForCopy(input: LoanInput, result: LoanResult): string {
  const termLabel = input.termUnit === "years" ? `${input.term} năm` : `${input.term} tháng`;
  const repaymentLabel = LOAN_REPAYMENT_LABELS[input.repaymentType];

  const lines = [
    "Kết quả tính lãi vay:",
    `Số tiền vay: ${formatCurrencyVND(result.principal)}`,
    `Lãi suất năm: ${result.annualRate}%`,
    `Thời hạn vay: ${termLabel}`,
    `Hình thức trả nợ: ${repaymentLabel}`
  ];

  if (input.repaymentType === "fixed_monthly_payment" && result.fixedMonthlyPayment !== undefined) {
    lines.push(`Trả hàng tháng: ${formatCurrencyVND(result.fixedMonthlyPayment)}`);
  }

  if (input.repaymentType === "declining_balance") {
    lines.push(`Tháng đầu trả: ${formatCurrencyVND(result.firstMonthPayment)}`);
    lines.push(`Tháng cuối trả: ${formatCurrencyVND(result.lastMonthPayment)}`);
  }

  if (input.repaymentType === "interest_only" && result.monthlyInterestOnly !== undefined) {
    lines.push(`Lãi hàng tháng: ${formatCurrencyVND(result.monthlyInterestOnly)}`);
    lines.push(`Gốc trả cuối kỳ: ${formatCurrencyVND(result.principal)}`);
  }

  lines.push(`Tổng tiền lãi: ${formatCurrencyVND(result.totalInterest)}`);
  lines.push(`Tổng tiền phải trả: ${formatCurrencyVND(result.totalPayment)}`);

  return lines.join("\n");
}
