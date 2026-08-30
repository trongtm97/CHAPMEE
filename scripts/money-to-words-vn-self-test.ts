/**
 * Self-test for money-to-words Vietnamese utility.
 * Run: npm run test:money-to-words
 */

import {
  cleanMoneyInput,
  generateMoneyToWordsResults,
  type MoneyToWordsOptions
} from "../lib/utilities/money-to-words-vn";

const DEFAULT_OPTIONS: MoneyToWordsOptions = {
  includeCurrency: true,
  includeEvenWord: false,
  removeTones: false
};

let passed = 0;
let failed = 0;

function assertEqual(actual: string, expected: string, label: string) {
  if (actual === expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected: ${expected}`);
  console.error(`  actual:   ${actual}`);
}

function assertClean(input: string, expected: string, label: string) {
  const actual = cleanMoneyInput(input);
  if (actual === expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL clean: ${label}`);
  console.error(`  expected: ${expected}`);
  console.error(`  actual:   ${actual}`);
}

function testConvert(input: string, expectedCapitalize: string, options = DEFAULT_OPTIONS) {
  const result = generateMoneyToWordsResults(input, options);
  if ("error" in result) {
    failed += 1;
    console.error(`FAIL: ${input} returned error ${result.error}`);
    return;
  }

  assertEqual(result.capitalizeFirst, expectedCapitalize, `${input} capitalizeFirst`);
  assertEqual(result.lower, expectedCapitalize.charAt(0).toLowerCase() + expectedCapitalize.slice(1), `${input} lower`);
  assertEqual(result.upper, result.lower.toUpperCase(), `${input} upper`);
}

const CORE_CASES: [string, string][] = [
  ["0", "Không đồng"],
  ["1", "Một đồng"],
  ["5", "Năm đồng"],
  ["10", "Mười đồng"],
  ["15", "Mười lăm đồng"],
  ["21", "Hai mươi mốt đồng"],
  ["25", "Hai mươi lăm đồng"],
  ["105", "Một trăm linh năm đồng"],
  ["1005", "Một nghìn không trăm linh năm đồng"],
  ["1050", "Một nghìn không trăm năm mươi đồng"],
  ["1500", "Một nghìn năm trăm đồng"],
  ["12345", "Mười hai nghìn ba trăm bốn mươi lăm đồng"],
  ["100000", "Một trăm nghìn đồng"],
  ["1000000", "Một triệu đồng"],
  ["1234567", "Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng"],
  ["1000000000", "Một tỷ đồng"],
  [
    "999999999999",
    "Chín trăm chín mươi chín tỷ chín trăm chín mươi chín triệu chín trăm chín mươi chín nghìn chín trăm chín mươi chín đồng"
  ]
];

for (const [input, expected] of CORE_CASES) {
  testConvert(input, expected);
}

const CLEAN_CASES: [string, string][] = [
  ["1.000.000đ", "1000000"],
  ["1.000.000 VND", "1000000"],
  ["1,000,000", "1000000"],
  ["1 000 000", "1000000"],
  ["  1.000.000  ", "1000000"],
  ["1.000.000 đồng", "1000000"]
];

for (const [input, expected] of CLEAN_CASES) {
  assertClean(input, expected, input);
  testConvert(input, "Một triệu đồng");
}

testConvert("1250000", "Mot trieu hai tram nam muoi nghin dong", {
  includeCurrency: true,
  includeEvenWord: false,
  removeTones: true
});

testConvert("1000000", "Một triệu đồng chẵn", {
  includeCurrency: true,
  includeEvenWord: true,
  removeTones: false
});

testConvert("1000000", "Một triệu", {
  includeCurrency: false,
  includeEvenWord: false,
  removeTones: false
});

console.log(`\nMoney-to-words self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
