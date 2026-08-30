/**
 * Self-test for interest calculator utility.
 * Run: npm run test:interest-calculator
 */

import {
  calculateCompoundInterest,
  calculateLoan,
  calculateSavingsInterest,
  cleanMoneyInput,
  durationToMonths,
  formatCurrencyVND,
  validateCompoundForm,
  validateRateInput,
  validateSavingsForm
} from "../lib/utilities/interest-calculator";

let passed = 0;
let failed = 0;

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${String(expected)}`);
  console.error(`  actual:   ${String(actual)}`);
}

function assertClose(actual: number, expected: number, label: string, tolerance = 1) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${expected}`);
  console.error(`  actual:   ${actual}`);
}

function assertGreater(actual: number, expected: number, label: string) {
  if (actual > expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected > ${expected}`);
  console.error(`  actual:   ${actual}`);
}

// Test 1: Lãi tiết kiệm cuối kỳ
const test1 = calculateSavingsInterest({
  principal: 100_000_000,
  annualRate: 5,
  term: 12,
  termUnit: "months",
  payoutType: "end_term"
});
assertEqual(formatCurrencyVND(test1.totalInterest), "5.000.000đ", "test 1 total interest");
assertEqual(formatCurrencyVND(test1.finalAmount), "105.000.000đ", "test 1 final amount");

// Test 2: Lãi tiết kiệm 6 tháng
const test2 = calculateSavingsInterest({
  principal: 50_000_000,
  annualRate: 4.8,
  term: 6,
  termUnit: "months",
  payoutType: "end_term"
});
assertEqual(formatCurrencyVND(test2.totalInterest), "1.200.000đ", "test 2 total interest");
assertEqual(formatCurrencyVND(test2.finalAmount), "51.200.000đ", "test 2 final amount");

// Test 3: Nhận lãi hàng tháng
const test3 = calculateSavingsInterest({
  principal: 100_000_000,
  annualRate: 6,
  term: 12,
  termUnit: "months",
  payoutType: "monthly"
});
assertEqual(formatCurrencyVND(test3.monthlyInterest ?? 0), "500.000đ", "test 3 monthly interest");
assertEqual(formatCurrencyVND(test3.totalInterest), "6.000.000đ", "test 3 total interest");

// Test 4: Nhập lãi vào gốc
const test4 = calculateSavingsInterest({
  principal: 100_000_000,
  annualRate: 6,
  term: 12,
  termUnit: "months",
  payoutType: "compound"
});
assertClose(test4.finalAmount, 106_167_781, "test 4 final amount", 2);
assertClose(test4.totalInterest, 6_167_781, "test 4 total interest", 2);

// Test 5: Lãi kép không góp thêm
const test5 = calculateCompoundInterest({
  initialAmount: 10_000_000,
  recurringContribution: 0,
  contributionFrequency: "monthly",
  annualRate: 8,
  duration: 10,
  durationUnit: "years",
  compoundFrequency: "yearly"
});
assertClose(test5.finalAmount, 21_589_250, "test 5 final amount", 1);
assertClose(test5.totalInterest, 11_589_250, "test 5 total interest", 1);

// Test 6: Lãi kép có góp thêm hàng tháng
const test6 = calculateCompoundInterest({
  initialAmount: 10_000_000,
  recurringContribution: 1_000_000,
  contributionFrequency: "monthly",
  annualRate: 8,
  duration: 10,
  durationUnit: "years",
  compoundFrequency: "monthly"
});
assertEqual(test6.totalPrincipal, 130_000_000, "test 6 total principal");
assertGreater(test6.finalAmount, 130_000_000, "test 6 final > principal");
assertEqual(
  Math.round(test6.totalInterest),
  Math.round(test6.finalAmount - 130_000_000),
  "test 6 interest formula"
);

// Test 7: Input có ký hiệu tiền
assertEqual(cleanMoneyInput("100.000.000đ"), 100_000_000, "test 7a money with đ");
assertEqual(cleanMoneyInput("100,000,000"), 100_000_000, "test 7b comma separator");
assertEqual(cleanMoneyInput("100 000 000"), 100_000_000, "test 7c space separator");
assertEqual(cleanMoneyInput("100.000.000 VND"), 100_000_000, "test 7d VND suffix");

// Test 8: Input rỗng
assertEqual(
  validateSavingsForm({ principal: "", annualRate: "5", term: "12", termUnit: "months", payoutType: "end_term" })
    .error,
  "Vui lòng nhập đầy đủ thông tin cần tính.",
  "test 8 empty"
);

// Test 9: Lãi suất âm
assertEqual(validateRateInput("-5").error, "Vui lòng nhập lãi suất hợp lệ.", "test 9 negative rate");

// Test 10: Thời gian bằng 0
assertEqual(
  validateCompoundForm({
    initialAmount: "10000000",
    recurringContribution: "0",
    contributionFrequency: "monthly",
    annualRate: "8",
    duration: "0",
    durationUnit: "years",
    compoundFrequency: "monthly"
  }).error,
  "Vui lòng nhập thời gian hợp lệ.",
  "test 10 zero duration"
);

// Loan Test 1: Trả góp đều hàng tháng
const loanTest1 = calculateLoan({
  principal: 100_000_000,
  annualRate: 12,
  term: 12,
  termUnit: "months",
  repaymentType: "fixed_monthly_payment"
});
assertClose(loanTest1.fixedMonthlyPayment ?? 0, 8_884_879, "loan test 1 monthly payment", 1);
assertClose(loanTest1.totalInterest, 6_618_546, "loan test 1 total interest", 1);
assertClose(loanTest1.totalPayment, 106_618_546, "loan test 1 total payment", 1);

// Loan Test 2: Trả theo dư nợ giảm dần
const loanTest2 = calculateLoan({
  principal: 100_000_000,
  annualRate: 12,
  term: 12,
  termUnit: "months",
  repaymentType: "declining_balance"
});
assertClose(loanTest2.monthlyPrincipal ?? 0, 8_333_333, "loan test 2 monthly principal", 1);
assertClose(loanTest2.firstMonthPayment, 9_333_333, "loan test 2 first month", 1);
assertClose(loanTest2.lastMonthPayment, 8_416_667, "loan test 2 last month", 1);
assertEqual(formatCurrencyVND(loanTest2.totalInterest), "6.500.000đ", "loan test 2 total interest");
assertEqual(formatCurrencyVND(loanTest2.totalPayment), "106.500.000đ", "loan test 2 total payment");

// Loan Test 3: Trả lãi hàng tháng, gốc trả cuối kỳ
const loanTest3 = calculateLoan({
  principal: 100_000_000,
  annualRate: 12,
  term: 12,
  termUnit: "months",
  repaymentType: "interest_only"
});
assertEqual(formatCurrencyVND(loanTest3.monthlyInterestOnly ?? 0), "1.000.000đ", "loan test 3 monthly interest");
assertEqual(formatCurrencyVND(loanTest3.totalInterest), "12.000.000đ", "loan test 3 total interest");
assertEqual(formatCurrencyVND(loanTest3.totalPayment), "112.000.000đ", "loan test 3 total payment");

// Loan Test 4: Lãi suất 0%
const loanTest4 = calculateLoan({
  principal: 120_000_000,
  annualRate: 0,
  term: 12,
  termUnit: "months",
  repaymentType: "fixed_monthly_payment"
});
assertEqual(formatCurrencyVND(loanTest4.fixedMonthlyPayment ?? 0), "10.000.000đ", "loan test 4 monthly payment");
assertEqual(formatCurrencyVND(loanTest4.totalInterest), "0đ", "loan test 4 total interest");
assertEqual(formatCurrencyVND(loanTest4.totalPayment), "120.000.000đ", "loan test 4 total payment");

// Loan Test 5: Thời hạn theo năm
const loanTest5 = calculateLoan({
  principal: 100_000_000,
  annualRate: 12,
  term: 1,
  termUnit: "years",
  repaymentType: "fixed_monthly_payment"
});
assertEqual(loanTest5.termMonths, 12, "loan test 5 term months");
assertEqual(durationToMonths(1, "years"), 12, "loan test 5 duration conversion");

console.log(`\ninterest-calculator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
