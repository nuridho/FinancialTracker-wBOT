// Offline unit checks for pure logic (no server/AI/DB needed).
// Run: node unit.test.js
const assert = require("assert");
const { parseCount } = require("../finance-service/src/utils/supabase");
const { summarizeRecords } = require("../finance-service/src/utils/helpers");

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

console.log("unit tests passed ✅");
