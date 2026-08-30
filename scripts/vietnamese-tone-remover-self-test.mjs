/**
 * Self-test for Vietnamese tone remover utility.
 * Run: node scripts/vietnamese-tone-remover-self-test.mjs
 */

const VIETNAMESE_CHAR_MAP = { đ: "d", Đ: "D" };
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()+=[\]{};:"'<>?/\\|]/g;

function removeVietnameseTones(input) {
  let value = input;
  for (const [from, to] of Object.entries(VIETNAMESE_CHAR_MAP)) {
    value = value.replaceAll(from, to);
  }
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSpaces(input) {
  return input.replace(/[ \t]+/g, " ").trimEnd();
}

function normalizeLineEndings(input) {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function replaceSpacesWithDelimiter(input, delimiter) {
  if (!delimiter) return input;
  return input.replace(/[ \t]+/g, delimiter);
}

function removeSpecialCharacters(input) {
  return input.replace(SPECIAL_CHAR_REGEX, "");
}

function toTitleCase(input) {
  return input.replace(/\S+/g, (word) => {
    const [first, ...rest] = word;
    if (!first) return word;
    return first.toUpperCase() + rest.join("");
  });
}

function toSlug(input) {
  let value = removeVietnameseTones(input).toLowerCase();
  value = removeSpecialCharacters(value);
  return value
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function applyCaseMode(input, caseMode) {
  switch (caseMode) {
    case "lowercase":
      return input.toLowerCase();
    case "uppercase":
      return input.toUpperCase();
    case "titlecase":
      return toTitleCase(input.toLowerCase());
    default:
      return input;
  }
}

function processLine(line, options) {
  const {
    caseMode = "preserve",
    removeSpecialChars = false,
    normalizeSpaces: shouldNormalizeSpaces = false,
    replaceSpaces = false,
    spaceDelimiter = "-"
  } = options;

  let value = removeVietnameseTones(line);
  value = applyCaseMode(value, caseMode);

  if (removeSpecialChars) {
    value = removeSpecialCharacters(value);
  }

  if (shouldNormalizeSpaces) {
    value = normalizeSpaces(value);
  }

  if (replaceSpaces) {
    value = replaceSpacesWithDelimiter(value, spaceDelimiter);
  }

  return value;
}

function processText(input, options = {}) {
  const { slug = false } = options;

  if (!input) return "";

  const normalized = normalizeLineEndings(input);

  if (slug) {
    return normalized
      .split("\n")
      .map((line) => (line.trim() ? toSlug(line) : ""))
      .join("\n");
  }

  return normalized
    .split("\n")
    .map((line) => processLine(line, options))
    .join("\n");
}

function getTextStats(input) {
  if (!input) return { characters: 0, words: 0, lines: 0 };
  const lines = normalizeLineEndings(input).split("\n");
  const words = input.trim() ? input.trim().split(/\s+/).filter(Boolean).length : 0;
  return { characters: input.length, words, lines: lines.length };
}

const cases = [
  {
    name: "basic sentence",
    input: "Đây là tiếng Việt có dấu.",
    expected: "Day la tieng Viet co dau."
  },
  {
    name: "proper name",
    input: "Nguyễn Văn Đạt",
    expected: "Nguyen Van Dat"
  },
  {
    name: "with special chars default",
    input: "Áo thun nữ mùa hè 2026!!!",
    expected: "Ao thun nu mua he 2026!!!"
  },
  {
    name: "with special chars removed",
    input: "Áo thun nữ mùa hè 2026!!!",
    options: { removeSpecialChars: true },
    expected: "Ao thun nu mua he 2026"
  },
  {
    name: "slug",
    input: "Áo thun nữ mùa hè 2026!!!",
    options: { slug: true },
    expected: "ao-thun-nu-mua-he-2026"
  },
  {
    name: "tech punctuation preserved",
    input: "Tôi đang học Next.js, React & TypeScript.",
    expected: "Toi dang hoc Next.js, React & TypeScript."
  },
  {
    name: "emoji preserved",
    input: "Cảm ơn bạn 😊",
    expected: "Cam on ban 😊"
  },
  {
    name: "multi-line",
    input: "Dòng một\nDòng hai\nDòng ba",
    expected: "Dong mot\nDong hai\nDong ba"
  },
  {
    name: "windows line endings",
    input: "Dòng một\r\nDòng hai\r\nDòng ba",
    expected: "Dong mot\nDong hai\nDong ba"
  },
  {
    name: "Đặng Văn Đông",
    input: "Đặng Văn Đông",
    expected: "Dang Van Dong"
  },
  {
    name: "lowercase mode",
    input: "Xin Chào Việt Nam",
    options: { caseMode: "lowercase" },
    expected: "xin chao viet nam"
  },
  {
    name: "uppercase mode",
    input: "Xin Chào Việt Nam",
    options: { caseMode: "uppercase" },
    expected: "XIN CHAO VIET NAM"
  },
  {
    name: "titlecase mode",
    input: "xin chào việt nam",
    options: { caseMode: "titlecase" },
    expected: "Xin Chao Viet Nam"
  },
  {
    name: "slug long phrase",
    input: "Xóa Dấu Tiếng Việt Online Miễn Phí",
    options: { slug: true },
    expected: "xoa-dau-tieng-viet-online-mien-phi"
  },
  {
    name: "normalize spaces",
    input: "Tôi    đang     học    tiếng   Việt",
    options: { normalizeSpaces: true },
    expected: "Toi dang hoc tieng Viet"
  },
  {
    name: "replace spaces with hyphen",
    input: "Áo thun nam mùa hè 2026",
    options: { replaceSpaces: true, spaceDelimiter: "-" },
    expected: "Ao-thun-nam-mua-he-2026"
  },
  {
    name: "slug multi-line preserves breaks",
    input: "Áo thun nam\nQuần jean nữ",
    options: { slug: true },
    expected: "ao-thun-nam\nquan-jean-nu"
  },
  {
    name: "replace spaces multi-line preserves breaks",
    input: "Dòng một hai\nDòng ba bốn",
    options: { replaceSpaces: true, spaceDelimiter: "_" },
    expected: "Dong_mot_hai\nDong_ba_bon"
  }
];

let failed = 0;

for (const testCase of cases) {
  const actual = processText(testCase.input, testCase.options ?? {});
  if (actual !== testCase.expected) {
    console.error(
      `FAIL [${testCase.name}]: got ${JSON.stringify(actual)}, expected ${JSON.stringify(testCase.expected)}`
    );
    failed += 1;
  } else {
    console.log(`OK [${testCase.name}]`);
  }
}

const stats = getTextStats("Tiếng Việt rất đẹp");
if (stats.characters !== 18 || stats.words !== 4 || stats.lines !== 1) {
  console.error(`FAIL [stats]: ${JSON.stringify(stats)}`);
  failed += 1;
} else {
  console.log("OK [stats]");
}

if (failed > 0) {
  process.exit(1);
}

console.log(`All ${cases.length + 1} checks passed.`);
