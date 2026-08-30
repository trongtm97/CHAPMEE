/**
 * Self-test for VAT calculator utility.
 * Run: npm run test:vat-calculator
 */

import {
  calculateVAT,
  calculateVATForward,
  calculateVATReverse,
  cleanMoneyInput,
  cleanVatRateInput,
  formatCurrencyVND,
  validateMoneyInput,
  validateVATInput,
  validateVatRateInput
} from "../lib/utilities/vat-calculator";

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

// Test 1: forward VAT 10%
const test1 = calculateVATForward(10_000_000, 10);
assertEqual(formatCurrencyVND(test1.beforeTaxAmount), "10.000.000đ", "test 1 before tax");
assertEqual(formatCurrencyVND(test1.vatAmount), "1.000.000đ", "test 1 vat");
assertEqual(formatCurrencyVND(test1.afterTaxAmount), "11.000.000đ", "test 1 after tax");

// Test 2: reverse VAT 10%
const test2 = calculateVATReverse(11_000_000, 10);
assertEqual(formatCurrencyVND(test2.beforeTaxAmount), "10.000.000đ", "test 2 before tax");
assertEqual(formatCurrencyVND(test2.vatAmount), "1.000.000đ", "test 2 vat");
assertEqual(formatCurrencyVND(test2.afterTaxAmount), "11.000.000đ", "test 2 after tax");

// Test 3: forward VAT 8%
const test3 = calculateVATForward(10_000_000, 8);
assertEqual(formatCurrencyVND(test3.vatAmount), "800.000đ", "test 3 vat");
assertEqual(formatCurrencyVND(test3.afterTaxAmount), "10.800.000đ", "test 3 after tax");

// Test 4: reverse VAT 8%
const test4 = calculateVATReverse(10_800_000, 8);
assertEqual(formatCurrencyVND(test4.beforeTaxAmount), "10.000.000đ", "test 4 before tax");
assertEqual(formatCurrencyVND(test4.vatAmount), "800.000đ", "test 4 vat");

// Test 5: forward VAT 5%
const test5 = calculateVATForward(1_000_000, 5);
assertEqual(formatCurrencyVND(test5.vatAmount), "50.000đ", "test 5 vat");
assertEqual(formatCurrencyVND(test5.afterTaxAmount), "1.050.000đ", "test 5 after tax");

// Test 6: forward VAT 0%
const test6 = calculateVATForward(1_000_000, 0);
assertEqual(formatCurrencyVND(test6.vatAmount), "0đ", "test 6 vat");
assertEqual(formatCurrencyVND(test6.afterTaxAmount), "1.000.000đ", "test 6 after tax");

// Test 7: reverse with fractional amounts
const test7 = calculateVATReverse(1_000_000, 8);
assertEqual(formatCurrencyVND(test7.beforeTaxAmount), "925.926đ", "test 7 before tax");
assertEqual(formatCurrencyVND(test7.vatAmount), "74.074đ", "test 7 vat");
assertEqual(formatCurrencyVND(test7.afterTaxAmount), "1.000.000đ", "test 7 after tax");

// Test 8: money input parsing
assertEqual(cleanMoneyInput("10.000.000đ"), 10_000_000, "test 8a");
assertEqual(cleanMoneyInput("10,000,000"), 10_000_000, "test 8b");
assertEqual(cleanMoneyInput("10 000 000"), 10_000_000, "test 8c");
assertEqual(cleanMoneyInput("10.000.000 VND"), 10_000_000, "test 8d");

// Test 9: empty amount
assertEqual(validateMoneyInput("").error, "Vui lòng nhập số tiền hợp lệ.", "test 9");

// Test 10: invalid rate
assertEqual(
  validateVATInput({ amount: "10.000.000", vatRate: "abc", mode: "forward" }).error,
  "Vui lòng nhập thuế suất VAT hợp lệ.",
  "test 10"
);

// Additional checks
assertEqual(cleanVatRateInput("10%"), 10, "rate with percent");
assertEqual(cleanVatRateInput("7.5"), 7.5, "decimal rate");
assertEqual(
  validateVatRateInput("150").error,
  "Thuế suất quá cao, vui lòng kiểm tra lại.",
  "rate over 100"
);
assertEqual(calculateVAT({ amount: 10_000_000, vatRate: 10, mode: "forward" }).afterTaxAmount, 11_000_000, "calculateVAT forward");

console.log(`\nvat-calculator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
