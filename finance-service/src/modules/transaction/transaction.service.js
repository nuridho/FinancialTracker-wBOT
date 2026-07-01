const { sbGet, sbPost, sbRpc, sbCount } = require("../../utils/supabase");

/**
 * Insert a single transaction row.
 */
async function insertTransaksi(userId, trxId, type, category, amount, accountName, message) {
  await sbPost("transactions", {
    user_id: userId,
    trx_id: trxId,
    type,
    category,
    amount,
    account_name: accountName,
    message,
    created_at: new Date().toISOString(),
  });
}

/**
 * Normalize account/rekening aliases to canonical names.
 * @param {string} nama
 * @returns {string}
 */
function normalizeRekening(nama) {
  if (!nama) return nama;
  const n = nama.trim().toLowerCase();

  const aliases = {
    jago: "Bank Jago",
    "bank jago": "Bank Jago",
    bca: "BCA",
    "bank bca": "BCA",
    "bank central asia": "BCA",
    bri: "BRI",
    "bank bri": "BRI",
    "bank rakyat indonesia": "BRI",
    bni: "BNI",
    "bank bni": "BNI",
    "bank negara indonesia": "BNI",
    mandiri: "Mandiri",
    "bank mandiri": "Mandiri",
    gopay: "GoPay",
    "go pay": "GoPay",
    ovo: "OVO",
    dana: "Dana",
    shopeepay: "ShopeePay",
    "shopee pay": "ShopeePay",
    spay: "ShopeePay",
    cash: "Cash",
    tunai: "Cash",
    "uang tunai": "Cash",
    "uang cash": "Cash",
  };

  return aliases[n] || nama.trim();
}

/**
 * Get the most recent transaction for a user.
 */
async function getLastTransaction(userId) {
  const rows = await sbGet(
    "transactions",
    `user_id=eq.${userId}&order=created_at.desc&limit=1`
  );
  return rows?.[0] || null;
}

/**
 * Delete a transaction (and its transfer pair if applicable) and reverse the balance impact.
 * Atomic — runs in a single PostgreSQL transaction via RPC.
 * Returns the deleted main transaction, or null if not found.
 */
async function deleteTransactionWithRollback(userId, trxId) {
  const result = await sbRpc("delete_transaction_with_rollback", {
    p_user_id: userId,
    p_trx_id: trxId,
  });
  return result?.[0] || null;
}

/**
 * Count INCOME + OUTCOME transactions in a date range (used for input limit).
 * Server-side count — no rows pulled into memory.
 */
async function getTransactionCount(userId, start, end) {
  return sbCount(
    "transactions",
    `user_id=eq.${userId}&type=in.(INCOME,OUTCOME)` +
    `&created_at=gte.${start.toISOString()}&created_at=lte.${end.toISOString()}`
  );
}

module.exports = { insertTransaksi, normalizeRekening, getLastTransaction, deleteTransactionWithRollback, getTransactionCount };
