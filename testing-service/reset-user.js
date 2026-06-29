require("dotenv").config({ path: __dirname + "/../finance-service/.env" });

const axios = require("axios");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USER_ID      = process.argv[2] || "dc09a82c-1701-4c35-9799-8da5ff555dcc";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL / SUPABASE_KEY tidak ditemukan di .env");
  process.exit(1);
}

const headers = {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer:        "return=representation",
};

async function supabaseDelete(table, query) {
  const res = await axios.delete(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    { headers }
  );
  return res.data; // array of deleted rows
}

async function supabasePatch(table, query, payload) {
  const res = await axios.patch(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    payload,
    { headers }
  );
  return res.data;
}

async function supabaseGet(table, query) {
  const res = await axios.get(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    { headers }
  );
  return res.data;
}

async function reset() {
  console.log(`\n🔄 Reset data untuk user: ${USER_ID}`);
  console.log("═".repeat(52));

  // 1. Cek sebelum reset
  const txBefore  = await supabaseGet("transactions", `user_id=eq.${USER_ID}&select=id`);
  const accBefore = await supabaseGet("accounts",     `user_id=eq.${USER_ID}&select=name,balance`);

  console.log(`\nSebelum reset:`);
  console.log(`  transactions : ${txBefore.length} baris`);
  console.log(`  accounts     : ${accBefore.length} akun`);
  if (accBefore.length > 0) {
    accBefore.forEach(a => console.log(`    ▪ ${a.name}: Rp ${Number(a.balance).toLocaleString("id-ID")}`));
  }

  // 2. Hapus semua transaksi
  const deletedTx = await supabaseDelete("transactions", `user_id=eq.${USER_ID}`);
  console.log(`\n🗑️  Hapus transactions : ${deletedTx.length} baris dihapus`);

  // 3. Zero out semua saldo akun (set balance = 0, tidak hapus akunnya)
  const zeroed = await supabasePatch(
    "accounts",
    `user_id=eq.${USER_ID}`,
    { balance: 0 }
  );
  console.log(`💰 Reset saldo accounts: ${zeroed.length} akun di-nol-kan`);
  if (zeroed.length > 0) {
    zeroed.forEach(a => console.log(`    ▪ ${a.name} → 0`));
  }

  // 4. Verifikasi
  const txAfter  = await supabaseGet("transactions", `user_id=eq.${USER_ID}&select=id`);
  const accAfter = await supabaseGet("accounts",     `user_id=eq.${USER_ID}&select=name,balance`);

  console.log(`\nVerifikasi setelah reset:`);
  console.log(`  transactions : ${txAfter.length} baris (harus 0)`);
  accAfter.forEach(a => console.log(`  ▪ ${a.name}: ${a.balance} (harus 0)`));

  const ok = txAfter.length === 0 && accAfter.every(a => Number(a.balance) === 0);
  console.log(`\n${"═".repeat(52)}`);
  console.log(`  ${ok ? "✅ Reset berhasil!" : "⚠️  Ada yang tidak beres, cek manual di Supabase"}`);
  console.log(`${"═".repeat(52)}\n`);
}

reset().catch(err => {
  console.error("❌ Error:", err.response?.data || err.message);
  process.exit(1);
});
