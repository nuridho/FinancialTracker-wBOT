// Offline unit checks for pure logic (no server/AI/DB needed).
// Run: node unit.test.js
const assert = require("assert");
const { parseCount } = require("../finance-service/src/utils/supabase");
const { summarizeRecords } = require("../finance-service/src/utils/helpers");
const { normalizeRekening } = require("../finance-service/src/modules/transaction/transaction.service");
const { getPeriodeGajian } = require("../finance-service/src/utils/helpers");

// parseCount: PostgREST Content-Range → total
assert.strictEqual(parseCount("0-0/42"), 42);
assert.strictEqual(parseCount("*/0"), 0);
assert.strictEqual(parseCount(undefined), 0);

// summarizeRecords: MULTI income/outcome totals
const s = summarizeRecords([
  { type: "INCOME", amt: 1000 },
  { type: "OUTCOME", amt: 250 },
  { type: "OUTCOME", amt: 750 },
]);
assert.strictEqual(s.income, 1000);
assert.strictEqual(s.outcome, 1000);

// normalizeRekening: alias → canonical (duplicate-account prevention)
assert.strictEqual(normalizeRekening("bca"), "BCA");
assert.strictEqual(normalizeRekening("Bank Central Asia"), "BCA");
assert.strictEqual(normalizeRekening("seabank"), "SeaBank");
assert.strictEqual(normalizeRekening("jenius"), "Jenius");
assert.strictEqual(normalizeRekening("btpn"), "Jenius");
assert.strictEqual(normalizeRekening("blu bca"), "Blu BCA");
assert.strictEqual(normalizeRekening("linkaja"), "LinkAja");
assert.strictEqual(normalizeRekening("UnknownBank"), "UnknownBank"); // pass-through
assert.strictEqual(normalizeRekening(null), null);                   // null-safe

// getPeriodeGajian: custom payday param
const ref = new Date(2025, 6, 20); // July 20
const p25 = getPeriodeGajian(ref, 25); // day 20 < payday 25 → previous period
assert.strictEqual(p25.start.getDate(), 25);
assert.strictEqual(p25.start.getMonth(), 5); // June 25
assert.strictEqual(p25.end.getDate(), 24);   // July 24
const p15 = getPeriodeGajian(ref, 15); // day 20 > payday 15 → current period
assert.strictEqual(p15.start.getDate(), 15);
assert.strictEqual(p15.start.getMonth(), 6); // July 15
assert.strictEqual(p15.end.getDate(), 14);   // Aug 14

console.log("unit tests passed ✅");
