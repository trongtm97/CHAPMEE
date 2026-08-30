/**
 * Self-test for text counter utility.
 * Run: npm run test:text-counter
 */

import {
  countCharacters,
  countCharactersWithoutSpaces,
  countLines,
  countParagraphs,
  countSentences,
  countWords,
  estimateReadingTime,
  estimateSpeakingTime,
  formatWordFrequencyForCopy,
  getTextStats,
  getWordFrequency,
  type WordFrequencyItem
} from "../lib/utilities/text-counter";

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

function formatFrequency(items: WordFrequencyItem[]): string {
  return items.map((item) => `${item.word}: ${item.count}`).join("\n");
}

function assertFrequency(
  input: string,
  expected: string,
  label: string,
  options?: Parameters<typeof getWordFrequency>[1]
) {
  const actual = formatFrequency(getWordFrequency(input, options));
  if (actual === expected) {
    passed += 1;
    return;
  }

  failed += 1;
  console.error(`FAIL: ${label}`);
  console.error(`  expected:\n${expected}`);
  console.error(`  actual:\n${actual}`);
}

function assertStats(
  input: string,
  expected: Partial<ReturnType<typeof getTextStats>>,
  label: string
) {
  const stats = getTextStats(input);
  for (const [key, value] of Object.entries(expected)) {
    const actual = stats[key as keyof typeof stats];
    if (Array.isArray(value) && Array.isArray(actual)) {
      if (JSON.stringify(actual) === JSON.stringify(value)) {
        passed += 1;
      } else {
        failed += 1;
        console.error(`FAIL: ${label} → ${key}`);
        console.error(`  expected: ${JSON.stringify(value)}`);
        console.error(`  actual:   ${JSON.stringify(actual)}`);
      }
      continue;
    }

    assertEqual(actual, value, `${label} → ${key}`);
  }
}

assertStats("", {
  characters: 0,
  charactersWithoutSpaces: 0,
  words: 0,
  sentences: 0,
  lines: 0,
  paragraphs: 0,
  readingTime: "0 phút",
  speakingTime: "0 phút",
  wordFrequency: []
}, "empty input");

assertStats("     ", {
  words: 0,
  sentences: 0,
  paragraphs: 0
}, "whitespace only");

assertStats("Tôi yêu Việt Nam", {
  characters: 16,
  charactersWithoutSpaces: 13,
  words: 4,
  sentences: 1,
  lines: 1,
  paragraphs: 1,
  readingTime: "Dưới 1 phút",
  speakingTime: "Dưới 1 phút"
}, "Vietnamese text");

assertStats("Tôi    đang     học   tiếng Việt", {
  words: 5
}, "multiple spaces");

assertStats("Xin chào. Bạn khỏe không? Tôi rất vui!", {
  words: 8,
  sentences: 3,
  lines: 1,
  paragraphs: 1
}, "multiple sentences");

assertStats("Dòng một\nDòng hai\nDòng ba", {
  lines: 3,
  paragraphs: 1
}, "multiple lines");

assertStats("Đây là đoạn một.\n\nĐây là đoạn hai.\n\nĐây là đoạn ba.", {
  paragraphs: 3
}, "multiple paragraphs");

assertStats("Đây là đoạn một.\n\nĐây là đoạn hai.", {
  paragraphs: 2
}, "two paragraphs");

assertEqual(countCharacters("Xin chào"), 8, "countCharacters simple");
assertEqual(countCharactersWithoutSpaces("Xin chào Việt Nam"), 14, "chars without spaces");

const emojiStats = getTextStats("Xin chào 😊");
assertEqual(emojiStats.characters > 0, true, "emoji characters");
assertEqual(emojiStats.words >= 2, true, "emoji words");

assertEqual(estimateReadingTime(0), "0 phút", "reading time empty");
assertEqual(estimateReadingTime(20), "Dưới 1 phút", "reading time short");
assertEqual(estimateReadingTime(100), "Khoảng 1 phút", "reading time 100 words");
assertEqual(estimateReadingTime(400), "Khoảng 2 phút", "reading time 400 words");

assertEqual(estimateSpeakingTime(0), "0 phút", "speaking time empty");
assertEqual(estimateSpeakingTime(20), "Dưới 1 phút", "speaking time short");
assertEqual(estimateSpeakingTime(65), "Khoảng 1 phút", "speaking time 65 words");
assertEqual(estimateSpeakingTime(260), "Khoảng 2 phút", "speaking time 260 words");

assertEqual(countWords("Tôi yêu Việt Nam"), 4, "countWords");
assertEqual(countSentences("Tôi đang học tiếng Việt"), 1, "countSentences no punctuation");
assertEqual(countLines(""), 0, "countLines empty");
assertEqual(countParagraphs(""), 0, "countParagraphs empty");

assertFrequency(
  "Tôi yêu Việt Nam. Việt Nam rất đẹp. Tôi thích du lịch Việt Nam.",
  "nam: 3\nviệt: 3\ntôi: 2\ndu: 1\nđẹp: 1\nlịch: 1\nrất: 1\nthích: 1\nyêu: 1",
  "word frequency test 1"
);

assertFrequency(
  "Áo thun đẹp, áo thun rẻ, áo thun hot.",
  "áo: 3\nthun: 3\nđẹp: 1\nhot: 1\nrẻ: 1",
  "word frequency test 2"
);

assertFrequency(
  "Việt Nam, việt nam! VIỆT NAM?",
  "nam: 3\nviệt: 3",
  "word frequency test 3"
);

assertFrequency(
  "Tôi    đang     học   tiếng Việt",
  "đang: 1\nhọc: 1\ntiếng: 1\ntôi: 1\nviệt: 1",
  "word frequency test 4"
);

assertEqual(getWordFrequency("").length, 0, "word frequency empty input");

assertFrequency(
  "Tôi ở nhà và đi ăn",
  "ăn: 1\nđi: 1\nnhà: 1\ntôi: 1\nvà: 1",
  "skip short words default"
);

assertFrequency(
  "Tôi ở nhà và đi ăn",
  "ăn: 1\nđi: 1\nnhà: 1\nở: 1\ntôi: 1\nvà: 1",
  "include short words",
  { minWordLength: 1, ignoreCommonWords: false, maxResults: 20 }
);

assertFrequency(
  "Tôi đang viết một bài viết về áo thun và áo thun mùa hè.",
  "áo: 2\nthun: 2\nviết: 2\nbài: 1\nđang: 1\nhè: 1\nmùa: 1\nvề: 1",
  "ignore common words",
  { minWordLength: 2, ignoreCommonWords: true, maxResults: 20 }
);

const emojiFrequency = getWordFrequency("Xin chào 😊");
assertEqual(emojiFrequency.some((item) => item.word.includes("😊")), false, "emoji not counted");

const copyFormat = formatWordFrequencyForCopy([
  { word: "áo", count: 3 },
  { word: "thun", count: 3 }
]);
assertEqual(copyFormat, "áo: 3 lần\nthun: 3 lần", "formatWordFrequencyForCopy");

console.log(`\ntext-counter self-test: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
