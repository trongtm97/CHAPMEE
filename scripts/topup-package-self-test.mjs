/**
 * Manual validation for top-up package payment rules (no hard-coded tiers).
 * Run: npm run test:topup
 */

const FORBIDDEN = [
  "amount_vnd",
  "base_coin",
  "bonus_percent",
  "bonus_coin",
  "total_coin"
];

function rejectForbiddenTopupClientFields(payload) {
  for (const key of FORBIDDEN) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return { ok: false, error: `forbidden:${key}` };
    }
  }
  return { ok: true };
}

function buildSnapshot(pack) {
  return {
    package_id: pack.id,
    package_name: pack.name,
    amount_vnd: pack.amount_vnd,
    base_coin: pack.base_coin,
    bonus_percent: pack.bonus_percent,
    bonus_coin: pack.bonus_coin,
    total_coin: pack.total_coin
  };
}

function validateSnapshot(snapshot) {
  if (snapshot.amount_vnd <= 0) return { ok: false, error: "amount" };
  if (snapshot.total_coin <= 0) return { ok: false, error: "total_coin" };
  return { ok: true, snapshot };
}

let failed = 0;

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL: ${name}`);
    failed += 1;
  } else {
    console.log(`OK: ${name}`);
  }
}

assert(
  "rejects client amount_vnd override",
  rejectForbiddenTopupClientFields({ package_id: "x", amount_vnd: 1000 }).ok === false
);

assert(
  "allows package_id only",
  rejectForbiddenTopupClientFields({ package_id: "abc" }).ok === true
);

const samplePack = {
  id: "pkg-1",
  name: "Gói 100.000đ",
  amount_vnd: 100000,
  base_coin: 100,
  bonus_percent: 2,
  bonus_coin: 2,
  total_coin: 102
};

const snapshot = buildSnapshot(samplePack);
assert("snapshot uses DB values", snapshot.total_coin === 102 && snapshot.amount_vnd === 100000);
assert("valid snapshot passes", validateSnapshot(snapshot).ok === true);
assert("invalid amount rejected", validateSnapshot({ ...snapshot, amount_vnd: 0 }).ok === false);
assert(
  "invalid total_coin rejected",
  validateSnapshot({ ...snapshot, total_coin: 0 }).ok === false
);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}

console.log("\nAll top-up package self-tests passed.");
