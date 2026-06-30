const { sbGet, sbPost, sbDelete, sbRpc } = require("../../utils/supabase");

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
 * Returns the deleted main transaction, or null if not found.
 */
async function deleteTransactionWithRollback(userId, trxId) {
  const rows = await sbGet("transactions", `user_id=eq.${userId}&trx_id=eq.${trxId}`);
  if (!rows || rows.length === 0) return null;

  const trx = rows[0];
  const toDelete = [trx];

  // SWITCH and old Transfer rows both have a paired leg — find and include it
  if (trx.type === "SWITCH" || trx.category === "Transfer") {
    const pairedId = trx.trx_id.endsWith("-TO")
      ? trx.trx_id.slice(0, -3)
      : trx.trx_id + "-TO";
    const paired = await sbGet("transactions", `user_id=eq.${userId}&trx_id=eq.${pairedId}`);
    if (paired && paired.length > 0) toDelete.push(paired[0]);
  }

  // Reverse balance for each leg
  for (const t of toDelete) {
    // ponytail: SWITCH both legs share type=SWITCH, so use -TO suffix to tell direction
    const delta = t.type === "SWITCH"
      ? (t.trx_id.endsWith("-TO") ? -Number(t.amount) : Number(t.amount))
      : (t.type === "INCOME" ? -Number(t.amount) : Number(t.amount));
    await sbRpc("upsert_account_balance", {
      p_user_id: userId,
      p_name: t.account_name,
      p_delta: delta,
    });
  }

  // Delete the row(s)
  for (const t of toDelete) {
    await sbDelete("transactions", `user_id=eq.${userId}&trx_id=eq.${t.trx_id}`);
  }

  return trx;
}

/**
 * Count INCOME + OUTCOME transactions in a date range (used for input limit).
 */
async function getTransactionCount(userId, start, end) {
  const rows = await sbGet(
    "transactions",
    `user_id=eq.${userId}&type=in.(INCOME,OUTCOME)` +
    `&created_at=gte.${start.toISOString()}&created_at=lte.${end.toISOString()}&select=id`
  );
  return rows?.length || 0;
}

module.exports = { insertTransaksi, normalizeRekening, getLastTransaction, deleteTransactionWithRollback, getTransactionCount };
