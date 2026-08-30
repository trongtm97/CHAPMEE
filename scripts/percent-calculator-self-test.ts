/**
 * Self-test for percent calculator utility.
 * Run: npm run test:percent-calculator
 */

import {
  calculateDiscountPrice,
  calculateIncreaseDecrease,
  calculateNumberIsWhatPercent,
  calculateOriginalPrice,
  calculatePercentChange,
  calculatePercentOfNumber,
  cleanNumberInput,
  cleanPercentInput,
  formatNumberVN,
  formatPercentVN,
  validatePercentageInput
} from "../lib/utilities/percent-calculator";

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

// Test 1: 10% of 1.000.000
const test1 = calculatePercentOfNumber({ percent: 10, value: 1_000_000 });
assertEqual(formatNumberVN(test1.mainValue), "100.000", "test 1 result");

// Test 2: 200 is what % of 1.000
const test2 = calculateNumberIsWhatPercent({ part: 200, total: 1_000 });
assertEqual(formatPercentVN(test2.mainValue), "20%", "test 2 percent");

// Test 3: increase 10% from 1.000.000
const test3 = calculateIncreaseDecrease({
  originalValue: 1_000_000,
  percent: 10,
  changeType: "increase"
});
assertEqual(formatNumberVN(test3.mainValue), "1.100.000", "test 3 new value");
assertEqual(formatNumberVN(test3.secondaryValue!), "100.000", "test 3 difference");

// Test 4: decrease 20% from 500.000
const test4 = calculateIncreaseDecrease({
  originalValue: 500_000,
  percent: 20,
  changeType: "decrease"
});
assertEqual(formatNumberVN(test4.mainValue), "400.000", "test 4 new value");
assertEqual(formatNumberVN(test4.secondaryValue!), "100.000", "test 4 difference");

// Test 5: percent change increase 100 → 150
const test5 = calculatePercentChange({ oldValue: 100, newValue: 150 });
assertEqual(test5.label, "Tăng 50%", "test 5 change");
assertEqual(formatNumberVN(test5.secondaryValue!), "50", "test 5 difference");

// Test 6: percent change decrease 200 → 150
const test6 = calculatePercentChange({ oldValue: 200, newValue: 150 });
assertEqual(test6.label, "Giảm 25%", "test 6 change");
assertEqual(formatNumberVN(test6.secondaryValue!), "-50", "test 6 difference");

// Test 7: discount price
const test7 = calculateDiscountPrice({ originalPrice: 1_000_000, discountPercent: 30 });
assertEqual(formatNumberVN(test7.secondaryValue!), "300.000", "test 7 discount");
assertEqual(formatNumberVN(test7.mainValue), "700.000", "test 7 final price");

// Test 8: original price
const test8 = calculateOriginalPrice({ finalPrice: 700_000, discountPercent: 30 });
assertEqual(formatNumberVN(test8.mainValue), "1.000.000", "test 8 original");
assertEqual(formatNumberVN(test8.secondaryValue!), "300.000", "test 8 discount amount");

// Test 9: decimal percent 12.5% of 800
const test9 = calculatePercentOfNumber({ percent: 12.5, value: 800 });
assertEqual(formatNumberVN(test9.mainValue), "100", "test 9 decimal percent");

// Test 10: divide by zero
assertEqual(
  validatePercentageInput("number_is_what_percent", { part: "200", total: "0" }).error,
  "Giá trị B phải khác 0.",
  "test 10 divide by zero"
);

// Test 11: flexible input parsing
assertEqual(cleanNumberInput("1.000.000đ"), 1_000_000, "test 11a");
assertEqual(cleanNumberInput("1,000,000"), 1_000_000, "test 11b");
assertEqual(cleanNumberInput("1 000 000"), 1_000_000, "test 11c");
assertEqual(cleanPercentInput("10%"), 10, "test 11d");
assertEqual(cleanPercentInput("10 %"), 10, "test 11e");

// Additional: original price validation
assertEqual(
  validatePercentageInput("original_price", { finalPrice: "700.000", discountPercent: "100" }).error,
  "Phần trăm giảm phải nhỏ hơn 100%.",
  "original price 100% discount"
);

// Additional: percent change old value zero
assertEqual(
  validatePercentageInput("percent_change", { oldValue: "0", newValue: "100" }).error,
  "Giá trị cũ phải khác 0 để tính phần trăm thay đổi.",
  "percent change zero old"
);

// Additional: discount 250k 15%
const testDiscount2 = calculateDiscountPrice({ originalPrice: 250_000, discountPercent: 15 });
assertEqual(formatNumberVN(testDiscount2.secondaryValue!), "37.500", "discount 15% amount");
assertEqual(formatNumberVN(testDiscount2.mainValue), "212.500", "discount 15% final");

console.log(`\npercent-calculator self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
