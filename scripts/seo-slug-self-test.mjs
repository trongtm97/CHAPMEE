const VIETNAMESE_CHAR_MAP = { đ: "d", Đ: "d" };

function normalizeVietnameseSlug(input) {
  let value = input.trim();
  for (const [from, to] of Object.entries(VIETNAMESE_CHAR_MAP)) {
    value = value.replaceAll(from, to);
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

const SEO_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const cases = [
  ["Bánh Cuốn Nhỏ", "banh-cuon-nho"],
  ["Đặng Lên 24h", "dang-len-24h"],
  ["  Hello   World  ", "hello-world"],
  ["---test---", "test"],
  ["Tiếng Việt 123!", "tieng-viet-123"]
];

let failed = 0;

for (const [input, expected] of cases) {
  const actual = normalizeVietnameseSlug(input);
  if (actual !== expected) {
    console.error(
      `FAIL: normalizeVietnameseSlug(${JSON.stringify(input)}) => ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
    );
    failed += 1;
  } else {
    console.log(`OK: ${JSON.stringify(input)} => ${actual}`);
  }
}

if (!SEO_SLUG_REGEX.test("banh-cuon-nho")) {
  console.error("FAIL: valid slug rejected by regex");
  failed += 1;
}

if (failed > 0) {
  process.exit(1);
}

console.log("All SEO slug self-tests passed.");
