const { sbGet, sbRpc } = require("../../utils/supabase");
const { formatRupiah } = require("../../utils/helpers");

/**
 * Update (or create) account balance by delta via Supabase RPC.
 * @param {string} userId
 * @param {"INCOME"|"OUTCOME"} type
 * @param {number} amt
 * @param {string} rekening  canonical account name
 */
async function updateSaldo(userId, type, amt, rekening) {
  const delta = type === "INCOME" ? amt : -amt;
  await sbRpc("upsert_account_balance", {
    p_user_id: userId,
    p_name: rekening,
    p_delta: delta,
  });
}

/**
 * Get balance for a single account.
 * Returns 0 if account not found.
 */
async function getSaldo(userId, rekening) {
  const rows = await sbGet(
    "accounts",
    `user_id=eq.${userId}&name=eq.${encodeURIComponent(rekening)}&select=balance`
  );
  if (!rows || rows.length === 0) return 0;
  return Number(rows[0].balance) || 0;
}

/**
 * Get formatted summary of all accounts.
 * @returns {Promise<string>}
 */
async function getAllSaldo(userId) {
  const rows = await sbGet(
    "accounts",
    `user_id=eq.${userId}&select=name,balance&order=name.asc`
  );

  if (!rows || rows.length === 0) return "Belum ada saldo tercatat.";

  let output = "💰 *Ringkasan Saldo*\n━━━━━━━━━━━━━━\n";
  let total = 0;

  for (const row of rows) {
    const saldo = Number(row.balance) || 0;
    output += `▪️ ${row.name}: Rp ${formatRupiah(saldo)}\n`;
    total += saldo;
  }

  output += `━━━━━━━━━━━━━━\n*Total:* Rp ${formatRupiah(total)}`;
  return output;
}

/**
 * Check if an account exists for a user (used to distinguish SWITCH vs OUTCOME).
 */
async function accountExists(userId, name) {
  const rows = await sbGet("accounts", `user_id=eq.${userId}&name=eq.${encodeURIComponent(name)}&select=id`);
  return rows && rows.length > 0;
}

/**
 * Rebuild all account balances from transaction history.
 * Requires resync_balances() SQL function in Supabase.
 */
async function resyncBalances(userId) {
  await sbRpc("resync_balances", { p_user_id: userId });
}

module.exports = { updateSaldo, getSaldo, getAllSaldo, accountExists, resyncBalances };
