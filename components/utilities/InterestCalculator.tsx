"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { UtilityModeSelector } from "@/components/utilities/UtilityModeSelector";
import {
  UtilityActionBar,
  UtilityActionSecondaryButton,
  utilityActionSecondaryClassName
} from "@/components/utilities/UtilityActionBar";
import { copyToClipboard } from "@/lib/utilities/copy-to-clipboard";
import {
  calculateCompoundInterest,
  calculateLoan,
  calculateSavingsInterest,
  COMPOUND_FREQUENCY_LABELS,
  CONTRIBUTION_FREQUENCY_LABELS,
  formatCompoundResultForCopy,
  formatCurrencyVND,
  formatGrowthPercent,
  formatLoanResultForCopy,
  formatSavingsResultForCopy,
  LOAN_REPAYMENT_LABELS,
  SAVINGS_PAYOUT_LABELS,
  validateCompoundForm,
  validateLoanForm,
  validateSavingsForm,
  type CalculatorMode,
  type CompoundFrequency,
  type CompoundInterestInput,
  type CompoundInterestResult,
  type ContributionFrequency,
  type LoanInput,
  type LoanRepaymentType,
  type LoanResult,
  type SavingsInterestInput,
  type SavingsInterestResult,
  type SavingsPayoutType,
  type TimeUnit
} from "@/lib/utilities/interest-calculator";

const SCHEDULE_PREVIEW_ROWS = 12;

const COMPOUND_SAMPLE = {
  initialAmount: "10000000",
  recurringContribution: "1000000",
  contributionFrequency: "monthly" as ContributionFrequency,
  annualRate: "8",
  duration: "10",
  durationUnit: "years" as TimeUnit,
  compoundFrequency: "monthly" as CompoundFrequency
};

const SAVINGS_SAMPLE = {
  principal: "100000000",
  annualRate: "5",
  term: "12",
  termUnit: "months" as TimeUnit,
  payoutType: "end_term" as SavingsPayoutType
};

const LOAN_SAMPLE = {
  principal: "100000000",
  annualRate: "12",
  term: "12",
  termUnit: "months" as TimeUnit,
  repaymentType: "fixed_monthly_payment" as LoanRepaymentType
};

const QUICK_EXAMPLES = [
  {
    mode: "compound" as CalculatorMode,
    label: "Lãi kép: 10.000.000đ, góp 1.000.000đ/tháng, lãi 8%/năm, 10 năm",
    data: COMPOUND_SAMPLE
  },
  {
    mode: "savings" as CalculatorMode,
    label: "Tiết kiệm: 100.000.000đ, lãi 5%/năm, kỳ hạn 12 tháng",
    data: SAVINGS_SAMPLE
  },
  {
    mode: "savings" as CalculatorMode,
    label: "Tiết kiệm 6 tháng: 50.000.000đ, lãi 4,5%/năm, kỳ hạn 6 tháng",
    data: {
      principal: "50000000",
      annualRate: "4.5",
      term: "6",
      termUnit: "months" as TimeUnit,
      payoutType: "end_term" as SavingsPayoutType
    }
  },
  {
    mode: "loan" as CalculatorMode,
    label: "Lãi vay: 100.000.000đ, lãi 12%/năm, 12 tháng, trả góp đều",
    data: LOAN_SAMPLE
  }
] as const;

const inputClassName =
  "w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

const selectClassName =
  "w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

const formGridClassName = "grid gap-3 sm:grid-cols-2";

export function InterestCalculator() {
  const moneyRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CalculatorMode>("compound");

  const [initialAmount, setInitialAmount] = useState("");
  const [recurringContribution, setRecurringContribution] = useState("");
  const [contributionFrequency, setContributionFrequency] = useState<ContributionFrequency>("monthly");
  const [compoundAnnualRate, setCompoundAnnualRate] = useState("");
  const [compoundDuration, setCompoundDuration] = useState("");
  const [compoundDurationUnit, setCompoundDurationUnit] = useState<TimeUnit>("years");
  const [compoundFrequency, setCompoundFrequency] = useState<CompoundFrequency>("monthly");

  const [principal, setPrincipal] = useState("");
  const [savingsAnnualRate, setSavingsAnnualRate] = useState("");
  const [savingsTerm, setSavingsTerm] = useState("");
  const [savingsTermUnit, setSavingsTermUnit] = useState<TimeUnit>("months");
  const [payoutType, setPayoutType] = useState<SavingsPayoutType>("end_term");

  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanAnnualRate, setLoanAnnualRate] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [loanTermUnit, setLoanTermUnit] = useState<TimeUnit>("months");
  const [repaymentType, setRepaymentType] = useState<LoanRepaymentType>("fixed_monthly_payment");

  const [compoundResult, setCompoundResult] = useState<CompoundInterestResult | null>(null);
  const [compoundInput, setCompoundInput] = useState<CompoundInterestInput | null>(null);
  const [savingsResult, setSavingsResult] = useState<SavingsInterestResult | null>(null);
  const [savingsInput, setSavingsInput] = useState<SavingsInterestInput | null>(null);
  const [loanResult, setLoanResult] = useState<LoanResult | null>(null);
  const [loanInput, setLoanInput] = useState<LoanInput | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const reportStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  const clearResults = useCallback(() => {
    setCompoundResult(null);
    setCompoundInput(null);
    setSavingsResult(null);
    setSavingsInput(null);
    setLoanResult(null);
    setLoanInput(null);
    setShowFullSchedule(false);
  }, []);

  const runCompoundCalculate = useCallback(
    (form: {
      initialAmount: string;
      recurringContribution: string;
      contributionFrequency: ContributionFrequency;
      annualRate: string;
      duration: string;
      durationUnit: TimeUnit;
      compoundFrequency: CompoundFrequency;
    }) => {
      const validation = validateCompoundForm(form);

      if (!validation.isValid || !validation.data) {
        clearResults();
        setErrorMessage(validation.error ?? "Vui lòng nhập đầy đủ thông tin cần tính.");
        setWarningMessage(null);
        return false;
      }

      setErrorMessage(null);
      setWarningMessage(validation.warning ?? null);
      setCompoundInput(validation.data);
      setCompoundResult(calculateCompoundInterest(validation.data));
      setSavingsResult(null);
      setSavingsInput(null);
      setLoanResult(null);
      setLoanInput(null);
      setShowFullSchedule(false);
      return true;
    },
    [clearResults]
  );

  const runSavingsCalculate = useCallback(
    (form: {
      principal: string;
      annualRate: string;
      term: string;
      termUnit: TimeUnit;
      payoutType: SavingsPayoutType;
    }) => {
      const validation = validateSavingsForm(form);

      if (!validation.isValid || !validation.data) {
        clearResults();
        setErrorMessage(validation.error ?? "Vui lòng nhập đầy đủ thông tin cần tính.");
        setWarningMessage(null);
        return false;
      }

      setErrorMessage(null);
      setWarningMessage(validation.warning ?? null);
      setSavingsInput(validation.data);
      setSavingsResult(calculateSavingsInterest(validation.data));
      setCompoundResult(null);
      setCompoundInput(null);
      setLoanResult(null);
      setLoanInput(null);
      setShowFullSchedule(false);
      return true;
    },
    [clearResults]
  );

  const runLoanCalculate = useCallback(
    (form: {
      principal: string;
      annualRate: string;
      term: string;
      termUnit: TimeUnit;
      repaymentType: LoanRepaymentType;
    }) => {
      const validation = validateLoanForm(form);

      if (!validation.isValid || !validation.data) {
        clearResults();
        setErrorMessage(validation.error ?? "Vui lòng nhập đầy đủ thông tin cần tính.");
        setWarningMessage(null);
        return false;
      }

      setErrorMessage(null);
      setWarningMessage(validation.warning ?? null);
      setLoanInput(validation.data);
      setLoanResult(calculateLoan(validation.data));
      setCompoundResult(null);
      setCompoundInput(null);
      setSavingsResult(null);
      setSavingsInput(null);
      setShowFullSchedule(false);
      return true;
    },
    [clearResults]
  );

  const handleCalculate = () => {
    setStatusMessage(null);
    if (mode === "compound") {
      runCompoundCalculate({
        initialAmount,
        recurringContribution,
        contributionFrequency,
        annualRate: compoundAnnualRate,
        duration: compoundDuration,
        durationUnit: compoundDurationUnit,
        compoundFrequency
      });
      return;
    }

    if (mode === "savings") {
      runSavingsCalculate({
        principal,
        annualRate: savingsAnnualRate,
        term: savingsTerm,
        termUnit: savingsTermUnit,
        payoutType
      });
      return;
    }

    runLoanCalculate({
      principal: loanPrincipal,
      annualRate: loanAnnualRate,
      term: loanTerm,
      termUnit: loanTermUnit,
      repaymentType
    });
  };

  const handleClear = () => {
    setInitialAmount("");
    setRecurringContribution("");
    setContributionFrequency("monthly");
    setCompoundAnnualRate("");
    setCompoundDuration("");
    setCompoundDurationUnit("years");
    setCompoundFrequency("monthly");
    setPrincipal("");
    setSavingsAnnualRate("");
    setSavingsTerm("");
    setSavingsTermUnit("months");
    setPayoutType("end_term");
    setLoanPrincipal("");
    setLoanAnnualRate("");
    setLoanTerm("");
    setLoanTermUnit("months");
    setRepaymentType("fixed_monthly_payment");
    clearResults();
    setErrorMessage(null);
    setWarningMessage(null);
    setStatusMessage(null);
    moneyRef.current?.focus();
  };

  const applyCompoundSample = (sample: typeof COMPOUND_SAMPLE) => {
    setMode("compound");
    setInitialAmount(sample.initialAmount);
    setRecurringContribution(sample.recurringContribution);
    setContributionFrequency(sample.contributionFrequency);
    setCompoundAnnualRate(sample.annualRate);
    setCompoundDuration(sample.duration);
    setCompoundDurationUnit(sample.durationUnit);
    setCompoundFrequency(sample.compoundFrequency);
    setStatusMessage(null);
    runCompoundCalculate(sample);
  };

  const applySavingsSample = (sample: typeof SAVINGS_SAMPLE) => {
    setMode("savings");
    setPrincipal(sample.principal);
    setSavingsAnnualRate(sample.annualRate);
    setSavingsTerm(sample.term);
    setSavingsTermUnit(sample.termUnit);
    setPayoutType(sample.payoutType);
    setStatusMessage(null);
    runSavingsCalculate(sample);
  };

  const applyLoanSample = (sample: typeof LOAN_SAMPLE) => {
    setMode("loan");
    setLoanPrincipal(sample.principal);
    setLoanAnnualRate(sample.annualRate);
    setLoanTerm(sample.term);
    setLoanTermUnit(sample.termUnit);
    setRepaymentType(sample.repaymentType);
    setStatusMessage(null);
    runLoanCalculate(sample);
  };

  const handlePasteSample = () => {
    if (mode === "compound") {
      applyCompoundSample(COMPOUND_SAMPLE);
      return;
    }
    if (mode === "savings") {
      applySavingsSample(SAVINGS_SAMPLE);
      return;
    }
    applyLoanSample(LOAN_SAMPLE);
  };

  const handleExampleClick = (example: (typeof QUICK_EXAMPLES)[number]) => {
    if (example.mode === "compound") {
      applyCompoundSample(example.data as typeof COMPOUND_SAMPLE);
      return;
    }
    if (example.mode === "savings") {
      applySavingsSample(example.data as typeof SAVINGS_SAMPLE);
      return;
    }
    applyLoanSample(example.data as typeof LOAN_SAMPLE);
  };

  const handleCopyResult = async () => {
    if (mode === "compound") {
      if (!compoundResult || !compoundInput) {
        reportStatus("Chưa có kết quả để sao chép.");
        return;
      }

      const ok = await copyToClipboard(formatCompoundResultForCopy(compoundInput, compoundResult));
      reportStatus(ok ? "Đã sao chép kết quả!" : "Không thể sao chép. Hãy thử chọn thủ công.");
      return;
    }

    if (mode === "savings") {
      if (!savingsResult || !savingsInput) {
        reportStatus("Chưa có kết quả để sao chép.");
        return;
      }

      const ok = await copyToClipboard(formatSavingsResultForCopy(savingsInput, savingsResult));
      reportStatus(ok ? "Đã sao chép kết quả!" : "Không thể sao chép. Hãy thử chọn thủ công.");
      return;
    }

    if (!loanResult || !loanInput) {
      reportStatus("Chưa có kết quả để sao chép.");
      return;
    }

    const ok = await copyToClipboard(formatLoanResultForCopy(loanInput, loanResult));
    reportStatus(ok ? "Đã sao chép kết quả lãi vay!" : "Không thể sao chép. Hãy thử chọn thủ công.");
  };

  const compoundScheduleRows =
    compoundResult && mode === "compound"
      ? showFullSchedule
        ? compoundResult.schedule
        : compoundResult.schedule.slice(0, SCHEDULE_PREVIEW_ROWS)
      : [];

  const savingsScheduleRows =
    savingsResult && mode === "savings"
      ? showFullSchedule
        ? savingsResult.schedule
        : savingsResult.schedule.slice(0, SCHEDULE_PREVIEW_ROWS)
      : [];

  const loanScheduleRows =
    loanResult && mode === "loan"
      ? showFullSchedule
        ? loanResult.schedule
        : loanResult.schedule.slice(0, SCHEDULE_PREVIEW_ROWS)
      : [];

  const totalScheduleRows =
    mode === "compound"
      ? (compoundResult?.schedule.length ?? 0)
      : mode === "savings"
        ? (savingsResult?.schedule.length ?? 0)
        : (loanResult?.schedule.length ?? 0);

  const hasSchedule =
    compoundScheduleRows.length > 0 || savingsScheduleRows.length > 0 || loanScheduleRows.length > 0;

  const hasMoreScheduleRows = totalScheduleRows > SCHEDULE_PREVIEW_ROWS;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">Tiện ích</p>
        <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">Công cụ tính lãi</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Tính nhanh lãi suất kép, lãi tiết kiệm và lãi vay — xem tổng tiền, tiền lãi và bảng chi tiết theo thời gian.
        </p>
      </header>

      <UtilityModeSelector
        ariaLabel="Chế độ tính"
        className="rounded-2xl border border-white/10 bg-zinc-950/50 p-1 md:p-2"
        onChange={setMode}
        options={[
          { value: "compound", label: "Lãi suất kép" },
          { value: "savings", label: "Lãi tiết kiệm" },
          { value: "loan", label: "Lãi vay" }
        ]}
        value={mode}
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="interest-inputs" className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-zinc-200" id="interest-inputs">
            Nhập liệu
          </h2>

          {mode === "compound" ? (
            <div className={formGridClassName}>
              <MoneyField
                id="compound-initial"
                label="Số tiền ban đầu"
                onChange={setInitialAmount}
                placeholder="Ví dụ: 10000000"
                ref={moneyRef}
                value={initialAmount}
              />
              <MoneyField
                id="compound-contribution"
                label="Góp thêm định kỳ"
                onChange={setRecurringContribution}
                placeholder="Ví dụ: 1000000"
                value={recurringContribution}
              />
              <SelectField
                id="contribution-frequency"
                label="Tần suất góp thêm"
                onChange={(value) => setContributionFrequency(value as ContributionFrequency)}
                options={Object.entries(CONTRIBUTION_FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                value={contributionFrequency}
              />
              <RateField
                id="compound-rate"
                onChange={setCompoundAnnualRate}
                value={compoundAnnualRate}
              />
              <DurationField
                duration={compoundDuration}
                durationUnit={compoundDurationUnit}
                idPrefix="compound"
                onDurationChange={setCompoundDuration}
                onUnitChange={setCompoundDurationUnit}
              />
              <SelectField
                id="compound-frequency"
                label="Tần suất nhập lãi"
                onChange={(value) => setCompoundFrequency(value as CompoundFrequency)}
                options={Object.entries(COMPOUND_FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                value={compoundFrequency}
              />
              <p className="text-xs leading-relaxed text-zinc-500 sm:col-span-2">
                Tần suất nhập lãi là số lần lãi được cộng vào gốc để tiếp tục sinh lãi.
              </p>
            </div>
          ) : mode === "savings" ? (
            <div className={formGridClassName}>
              <MoneyField
                id="savings-principal"
                label="Số tiền gửi"
                onChange={setPrincipal}
                placeholder="Ví dụ: 100000000"
                ref={moneyRef}
                value={principal}
              />
              <RateField id="savings-rate" onChange={setSavingsAnnualRate} value={savingsAnnualRate} />
              <DurationField
                duration={savingsTerm}
                durationUnit={savingsTermUnit}
                idPrefix="savings"
                label="Kỳ hạn gửi"
                onDurationChange={setSavingsTerm}
                onUnitChange={setSavingsTermUnit}
              />
              <SelectField
                id="payout-type"
                label="Hình thức nhận lãi"
                onChange={(value) => setPayoutType(value as SavingsPayoutType)}
                options={Object.entries(SAVINGS_PAYOUT_LABELS).map(([value, label]) => ({ value, label }))}
                value={payoutType}
              />
            </div>
          ) : (
            <div className={formGridClassName}>
              <MoneyField
                id="loan-principal"
                label="Số tiền vay"
                onChange={setLoanPrincipal}
                placeholder="Ví dụ: 100000000"
                ref={moneyRef}
                value={loanPrincipal}
              />
              <RateField
                id="loan-rate"
                label="Lãi suất vay năm (%)"
                onChange={setLoanAnnualRate}
                placeholder="Ví dụ: 12"
                value={loanAnnualRate}
              />
              <DurationField
                duration={loanTerm}
                durationUnit={loanTermUnit}
                idPrefix="loan"
                label="Thời hạn vay"
                onDurationChange={setLoanTerm}
                onUnitChange={setLoanTermUnit}
              />
              <SelectField
                id="repayment-type"
                label="Hình thức trả nợ"
                onChange={(value) => setRepaymentType(value as LoanRepaymentType)}
                options={Object.entries(LOAN_REPAYMENT_LABELS).map(([value, label]) => ({ value, label }))}
                value={repaymentType}
              />
            </div>
          )}

          {errorMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {warningMessage ? (
            <p aria-live="polite" className="text-sm font-medium text-amber-200/90" role="status">
              {warningMessage}
            </p>
          ) : null}

          <UtilityActionBar primary={{ label: "Tính lãi", onClick: handleCalculate }}>
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

        <section aria-labelledby="interest-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="interest-results">
            Kết quả
          </h2>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
            {mode === "compound" && compoundResult ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard highlight label="Tổng tiền cuối kỳ" value={formatCurrencyVND(compoundResult.finalAmount)} />
                <ResultCard label="Tiền ban đầu" value={formatCurrencyVND(compoundResult.initialAmount)} />
                <ResultCard label="Tổng góp thêm" value={formatCurrencyVND(compoundResult.totalContribution)} />
                <ResultCard label="Tổng tiền gốc" value={formatCurrencyVND(compoundResult.totalPrincipal)} />
                <ResultCard label="Tổng tiền lãi" value={formatCurrencyVND(compoundResult.totalInterest)} />
                <ResultCard label="Tăng trưởng" value={formatGrowthPercent(compoundResult.growthPercent)} />
              </div>
            ) : mode === "savings" && savingsResult ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard label="Số tiền gửi" value={formatCurrencyVND(savingsResult.principal)} />
                <ResultCard label="Lãi suất năm" value={`${savingsResult.annualRate}%`} />
                <ResultCard
                  label="Kỳ hạn"
                  value={`${savingsResult.termMonths} tháng`}
                />
                {savingsResult.monthlyInterest !== undefined ? (
                  <ResultCard label="Lãi mỗi tháng" value={formatCurrencyVND(savingsResult.monthlyInterest)} />
                ) : null}
                <ResultCard label="Tiền lãi dự kiến" value={formatCurrencyVND(savingsResult.totalInterest)} />
                <ResultCard
                  highlight
                  label="Tổng nhận cuối kỳ"
                  value={formatCurrencyVND(savingsResult.finalAmount)}
                />
              </div>
            ) : mode === "loan" && loanResult && loanInput ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard label="Số tiền vay" value={formatCurrencyVND(loanResult.principal)} />
                <ResultCard label="Lãi suất năm" value={`${loanResult.annualRate}%`} />
                <ResultCard label="Thời hạn vay" value={`${loanResult.termMonths} tháng`} />
                <ResultCard
                  label="Hình thức trả nợ"
                  value={LOAN_REPAYMENT_LABELS[loanInput.repaymentType]}
                />
                {loanResult.fixedMonthlyPayment !== undefined ? (
                  <ResultCard
                    highlight
                    label="Trả hàng tháng"
                    value={formatCurrencyVND(loanResult.fixedMonthlyPayment)}
                  />
                ) : null}
                {loanResult.monthlyPrincipal !== undefined ? (
                  <ResultCard
                    label="Tiền gốc mỗi tháng"
                    value={formatCurrencyVND(loanResult.monthlyPrincipal)}
                  />
                ) : null}
                {loanInput.repaymentType === "declining_balance" ? (
                  <>
                    <ResultCard label="Tháng đầu trả" value={formatCurrencyVND(loanResult.firstMonthPayment)} />
                    <ResultCard label="Tháng cuối trả" value={formatCurrencyVND(loanResult.lastMonthPayment)} />
                  </>
                ) : null}
                {loanResult.monthlyInterestOnly !== undefined ? (
                  <ResultCard label="Lãi hàng tháng" value={formatCurrencyVND(loanResult.monthlyInterestOnly)} />
                ) : null}
                {loanInput.repaymentType === "interest_only" ? (
                  <ResultCard label="Gốc trả cuối kỳ" value={formatCurrencyVND(loanResult.principal)} />
                ) : null}
                <ResultCard label="Tổng tiền lãi" value={formatCurrencyVND(loanResult.totalInterest)} />
                <ResultCard
                  highlight={loanInput.repaymentType !== "fixed_monthly_payment"}
                  label="Tổng tiền phải trả"
                  value={formatCurrencyVND(loanResult.totalPayment)}
                />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Nhập thông tin và bấm &ldquo;Tính lãi&rdquo; để xem kết quả.
              </p>
            )}
          </div>
        </section>
      </div>

      {hasSchedule ? (
        <section aria-labelledby="interest-schedule" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200" id="interest-schedule">
            {mode === "loan" ? "Lịch trả nợ theo tháng" : "Bảng chi tiết theo thời gian"}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/50">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-white/10 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-400">
                {mode === "compound" ? (
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Kỳ</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền đầu kỳ</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền góp thêm</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền lãi kỳ này</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền cuối kỳ</th>
                  </tr>
                ) : mode === "savings" ? (
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Tháng</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền gốc</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền lãi tháng</th>
                    <th className="px-3 py-2.5 font-semibold">Lãi lũy kế</th>
                    <th className="px-3 py-2.5 font-semibold">Tổng tạm tính</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Tháng</th>
                    <th className="px-3 py-2.5 font-semibold">Dư nợ đầu kỳ</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền gốc</th>
                    <th className="px-3 py-2.5 font-semibold">Tiền lãi</th>
                    <th className="px-3 py-2.5 font-semibold">Tổng trả tháng</th>
                    <th className="px-3 py-2.5 font-semibold">Dư nợ cuối kỳ</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-200">
                {mode === "compound"
                  ? compoundScheduleRows.map((row) => (
                      <tr key={row.period}>
                        <td className="px-3 py-2">{row.label}</td>
                        <td className="px-3 py-2">{formatCurrencyVND(row.startingBalance)}</td>
                        <td className="px-3 py-2">{formatCurrencyVND(row.contribution)}</td>
                        <td className="px-3 py-2">{formatCurrencyVND(row.interest)}</td>
                        <td className="px-3 py-2 font-medium">{formatCurrencyVND(row.endingBalance)}</td>
                      </tr>
                    ))
                  : mode === "savings"
                    ? savingsScheduleRows.map((row) => (
                        <tr key={row.month}>
                          <td className="px-3 py-2">Tháng {row.month}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.principal)}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.monthlyInterest)}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.accumulatedInterest)}</td>
                          <td className="px-3 py-2 font-medium">{formatCurrencyVND(row.estimatedTotal)}</td>
                        </tr>
                      ))
                    : loanScheduleRows.map((row) => (
                        <tr key={row.month}>
                          <td className="px-3 py-2">Tháng {row.month}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.startingBalance)}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.principalPayment)}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.interestPayment)}</td>
                          <td className="px-3 py-2">{formatCurrencyVND(row.totalPayment)}</td>
                          <td className="px-3 py-2 font-medium">{formatCurrencyVND(row.endingBalance)}</td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
          {hasMoreScheduleRows ? (
            <button
              className={utilityActionSecondaryClassName}
              onClick={() => setShowFullSchedule((current) => !current)}
              type="button"
            >
              {showFullSchedule
                ? mode === "loan"
                  ? "Thu gọn lịch trả nợ"
                  : "Thu gọn bảng"
                : mode === "loan"
                  ? "Xem thêm lịch trả nợ"
                  : "Xem thêm"}
            </button>
          ) : null}
        </section>
      ) : null}

      <p className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="font-semibold">Lưu ý:</strong>{" "}
        {mode === "loan"
          ? "Kết quả chỉ mang tính tham khảo. Khoản vay thực tế có thể bao gồm phí hồ sơ, phí bảo hiểm, phí trả nợ trước hạn, lãi phạt quá hạn hoặc điều kiện riêng theo từng đơn vị cho vay."
          : "Kết quả chỉ mang tính tham khảo. Lãi suất thực tế có thể thay đổi theo ngân hàng, kỳ hạn, thời điểm gửi, thuế, phí và quy định từng sản phẩm tài chính. Công cụ không tự động cập nhật lãi suất ngân hàng. Vui lòng nhập lãi suất theo thông tin bạn có."}
      </p>

      <section aria-labelledby="interest-examples" className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200" id="interest-examples">
          Ví dụ nhanh
        </h2>
        <div className="grid gap-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 text-left text-sm transition hover:border-cyan-300/25 hover:bg-zinc-900/60"
              key={example.label}
              onClick={() => handleExampleClick(example)}
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

function MoneyField({
  id,
  label,
  onChange,
  placeholder,
  ref,
  value
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  ref?: RefObject<HTMLInputElement | null>;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-200" htmlFor={id}>
        {label}
      </label>
      <input
        className={inputClassName}
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={ref}
        type="text"
        value={value}
      />
    </div>
  );
}

function RateField({
  id,
  label = "Lãi suất năm (%)",
  onChange,
  placeholder = "Ví dụ: 8",
  value
}: {
  id: string;
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
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
        type="text"
        value={value}
      />
    </div>
  );
}

function DurationField({
  duration,
  durationUnit,
  idPrefix,
  label = "Thời gian",
  onDurationChange,
  onUnitChange
}: {
  duration: string;
  durationUnit: TimeUnit;
  idPrefix: string;
  label?: string;
  onDurationChange: (value: string) => void;
  onUnitChange: (value: TimeUnit) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-200" htmlFor={`${idPrefix}-duration`}>
        {label}
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-2">
        <input
          className={inputClassName}
          id={`${idPrefix}-duration`}
          inputMode="numeric"
          onChange={(event) => onDurationChange(event.target.value)}
          placeholder="Ví dụ: 10"
          type="text"
          value={duration}
        />
        <select
          aria-label="Đơn vị thời gian"
          className={selectClassName}
          onChange={(event) => onUnitChange(event.target.value as TimeUnit)}
          value={durationUnit}
        >
          <option value="years">Năm</option>
          <option value="months">Tháng</option>
        </select>
      </div>
    </div>
  );
}

function SelectField({
  id,
  label,
  onChange,
  options,
  value
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-200" htmlFor={id}>
        {label}
      </label>
      <select
        className={selectClassName}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ResultCard({
  highlight = false,
  label,
  value
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight ? "border-cyan-300/25 bg-cyan-300/5" : "border-white/10 bg-zinc-900/40"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${highlight ? "text-cyan-100" : "text-zinc-100"}`}>{value}</p>
    </div>
  );
}
