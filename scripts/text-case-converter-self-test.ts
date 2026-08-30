/**
 * Self-test for text case converter utility.
 * Run: npm run test:text-case-converter
 */

import {
  capitalizeEachWord,
  capitalizeFirstLetter,
  capitalizeSentences,
  generateCaseResults,
  getTextStats,
  invertCase,
  toLowerCaseText,
  toUpperCaseText
} from "../lib/utilities/text-case-converter";

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

function assertResults(
  input: string,
  expected: Partial<ReturnType<typeof generateCaseResults>>,
  label: string
) {
  const results = generateCaseResults(input);
  for (const [key, value] of Object.entries(expected)) {
    assertEqual(results[key as keyof typeof results], value, `${label} → ${key}`);
  }
}

// Test 1
assertResults(
  "xin chào việt nam",
  {
    capitalizeFirst: "Xin chào việt nam",
    lower: "xin chào việt nam",
    upper: "XIN CHÀO VIỆT NAM",
    titleCase: "Xin Chào Việt Nam",
    sentenceCase: "Xin chào việt nam",
    inverseCase: "XIN CHÀO VIỆT NAM"
  },
  "test 1"
);

// Test 2
assertResults(
  "Xin Chào VIỆT NAM",
  {
    capitalizeFirst: "Xin chào việt nam",
    lower: "xin chào việt nam",
    upper: "XIN CHÀO VIỆT NAM",
    titleCase: "Xin Chào Việt Nam",
    inverseCase: "xIN cHÀO việt nam"
  },
  "test 2"
);

// Test 3
assertEqual(
  capitalizeSentences("xin chào. bạn khỏe không? tôi rất vui!"),
  "Xin chào. Bạn khỏe không? Tôi rất vui!",
  "test 3 sentence case"
);

// Test 4
assertResults(
  "áo THUN nam MÙA hè 2026",
  {
    lower: "áo thun nam mùa hè 2026",
    upper: "ÁO THUN NAM MÙA HÈ 2026",
    titleCase: "Áo Thun Nam Mùa Hè 2026"
  },
  "test 4"
);

// Test 5 — emoji and punctuation preserved
const emojiInput = "Xin chào 😊 Việt Nam!";
const emojiResults = generateCaseResults(emojiInput);
assertEqual(emojiResults.lower.includes("😊"), true, "test 5 emoji preserved in lower");
assertEqual(emojiResults.upper.includes("😊"), true, "test 5 emoji preserved in upper");
assertEqual(emojiResults.lower.endsWith("!"), true, "test 5 punctuation preserved");

// Test 6 — multiline preserves newlines
const multilineInput = "xin chào việt nam\ntôi đang học lập trình";
assertEqual(
  capitalizeFirstLetter(multilineInput),
  "Xin chào việt nam\ntôi đang học lập trình",
  "test 6 capitalize first multiline"
);
assertEqual(
  capitalizeSentences(multilineInput),
  "Xin chào việt nam\ntôi đang học lập trình",
  "test 6 sentence case multiline"
);

// Additional unit tests
assertEqual(capitalizeFirstLetter("xIN CHÀO VIỆT NAM"), "Xin chào việt nam", "capitalizeFirst mixed case");
assertEqual(toLowerCaseText("Xin Chào VIỆT NAM"), "xin chào việt nam", "toLowerCaseText");
assertEqual(toUpperCaseText("Xin chào Việt Nam"), "XIN CHÀO VIỆT NAM", "toUpperCaseText");
assertEqual(capitalizeEachWord("xin chào VIỆT NAM"), "Xin Chào Việt Nam", "capitalizeEachWord");
assertEqual(
  invertCase("Xin Chào Việt Nam 2026!"),
  "xIN cHÀO vIỆT nAM 2026!",
  "invertCase"
);
assertEqual(
  capitalizeSentences("đây là câu một. đây là câu hai."),
  "Đây là câu một. Đây là câu hai.",
  "capitalizeSentences two sentences"
);

// Stats
assertEqual(getTextStats("").characters, 0, "stats empty characters");
assertEqual(getTextStats("").words, 0, "stats empty words");
assertEqual(getTextStats("").lines, 0, "stats empty lines");
assertEqual(getTextStats("Xin chào Việt Nam").characters, 17, "stats characters");
assertEqual(getTextStats("Xin chào Việt Nam").words, 4, "stats words");
assertEqual(getTextStats("Xin chào Việt Nam").lines, 1, "stats lines");

console.log(`\ntext-case-converter self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
